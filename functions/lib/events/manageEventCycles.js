"use strict";
/**
 * Cloud Function for managing event cycles
 * Scheduled function that handles event expiration, winner selection, and new cycle creation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.manageEventCycles = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const crypto = require("crypto");
const db = admin.firestore();
// Event configuration - 3 minutes for testing, change to 3 hours for production
const CYCLE_DURATION_MS = 3 * 60 * 1000; // 3 minutes for testing
// const CYCLE_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours for production
const ENTRY_COST = 100;
const PRIZE_POOL_PERCENTAGE = 0.7;
/**
 * Helper function to create a new event
 */
function createNewEvent(cycleNumber) {
    const now = Date.now();
    return {
        eventId: `event_${now}_cycle_${cycleNumber}`,
        cycleNumber,
        startTime: admin.firestore.Timestamp.fromMillis(now),
        endTime: admin.firestore.Timestamp.fromMillis(now + CYCLE_DURATION_MS),
        entryCost: ENTRY_COST,
        totalEntries: 0,
        prizePool: 0,
        status: 'active'
    };
}
/**
 * Helper function to pick a random winner using crypto-secure RNG
 */
async function pickWinner(eventId, totalEntries) {
    // Generate crypto-secure random seed for auditability
    const rngSeed = crypto.randomBytes(32).toString('hex');
    // Use the seed to generate a random number
    const hash = crypto.createHash('sha256').update(rngSeed).digest();
    const randomValue = hash.readUInt32BE(0) / 0xFFFFFFFF; // Normalize to 0-1
    const winnerTicket = Math.floor(randomValue * totalEntries);
    // Fetch winner by ticket number from the current event's entries
    // Always use 'current' since entries are stored under globalEvents/current/entries
    const entriesRef = db.collection('globalEvents').doc('current').collection('entries');
    const winnerQuery = await entriesRef
        .where('ticketNumber', '==', winnerTicket)
        .limit(1)
        .get();
    if (winnerQuery.empty) {
        console.error(`No entry found for ticket ${winnerTicket}`);
        console.error(`Event ID: ${eventId}, Total entries: ${totalEntries}, Winner ticket: ${winnerTicket}`);
        return null;
    }
    const winnerId = winnerQuery.docs[0].data().userId;
    return { winnerId, winnerTicket, rngSeed };
}
/**
 * Helper function to award prize to winner
 */
async function awardPrize(winnerId, prizeAmount, eventId, cycleNumber) {
    const userRef = db.collection('users').doc(winnerId);
    await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) {
            console.error(`Winner user ${winnerId} not found`);
            return;
        }
        const userData = userDoc.data();
        const currencyBalances = userData.currencyBalances || { gold: 0, gems: 0, tokens: 0 };
        const currentGold = currencyBalances.gold || 0;
        const newGoldBalance = currentGold + prizeAmount;
        // Update user balance
        transaction.update(userRef, {
            'currencyBalances.gold': newGoldBalance,
            'currencyBalances.lastUpdated': admin.firestore.FieldValue.serverTimestamp()
        });
        // Create transaction record
        const transactionRef = db.collection('transactions').doc();
        transaction.set(transactionRef, {
            userId: winnerId,
            type: 'reward',
            currencyType: 'gold',
            amount: prizeAmount,
            balanceAfter: newGoldBalance,
            description: `Event prize - Cycle ${cycleNumber}`,
            metadata: {
                eventId,
                cycleNumber,
                prizeType: 'event_winner'
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    });
    console.log({
        action: 'prize_awarded',
        winnerId,
        prizeAmount,
        eventId,
        cycleNumber,
        timestamp: Date.now()
    });
}
/**
 * Helper function to clear all entries from the current event
 * This must be called outside of a transaction since it involves batch deletes
 */
async function clearEventEntries() {
    try {
        console.log('🧹 Clearing old event entries...');
        const entriesRef = db.collection('globalEvents').doc('current').collection('entries');
        const entriesSnapshot = await entriesRef.get();
        if (entriesSnapshot.empty) {
            console.log('✅ No entries to clear');
            return;
        }
        // Delete entries in batches (Firestore limit is 500 per batch)
        const batchSize = 500;
        const batches = [];
        let currentBatch = db.batch();
        let operationCount = 0;
        entriesSnapshot.docs.forEach((doc) => {
            currentBatch.delete(doc.ref);
            operationCount++;
            if (operationCount === batchSize) {
                batches.push(currentBatch);
                currentBatch = db.batch();
                operationCount = 0;
            }
        });
        // Add the last batch if it has operations
        if (operationCount > 0) {
            batches.push(currentBatch);
        }
        // Commit all batches
        await Promise.all(batches.map(batch => batch.commit()));
        console.log({
            action: 'entries_cleared',
            entriesDeleted: entriesSnapshot.size,
            batchesExecuted: batches.length,
            timestamp: Date.now()
        });
    }
    catch (error) {
        console.error('❌ Error clearing event entries:', error);
        // Don't throw - this is a cleanup operation and shouldn't fail the whole cycle
    }
}
/**
 * Manage Event Cycles
 * Scheduled function (Pub/Sub) that:
 * - Runs every 3 minutes (configurable for staging vs production)
 * - Uses idempotent guards (status === 'active' check)
 * - Picks winner using sequential ticket numbers with logged RNG seed
 * - Awards prize via transaction
 * - Archives completed events to globalEvents/history
 * - Creates next event cycle atomically
 */
exports.manageEventCycles = functions.pubsub
    .schedule('every 3 minutes') // Change to 'every 3 hours' for production
    .timeZone('UTC')
    .onRun(async (context) => {
    console.log('🔄 Starting event cycle management...');
    try {
        const eventRef = db.collection('globalEvents').doc('current');
        await db.runTransaction(async (transaction) => {
            const eventDoc = await transaction.get(eventRef);
            // If no event exists, create the initial one
            if (!eventDoc.exists) {
                console.log('📝 No event exists, creating initial event...');
                const initialEvent = createNewEvent(0);
                transaction.set(eventRef, initialEvent);
                console.log({
                    action: 'initial_event_created',
                    eventId: initialEvent.eventId,
                    cycleNumber: 0,
                    timestamp: Date.now()
                });
                return;
            }
            const event = eventDoc.data();
            // Guard: only process if active
            if (event.status !== 'active') {
                console.log('⏭️  Event already processed, skipping');
                return;
            }
            // Guard: only process if expired
            const now = Date.now();
            const endTime = event.endTime.toMillis();
            if (endTime > now) {
                const timeLeft = Math.floor((endTime - now) / 1000);
                console.log(`⏰ Event not expired yet, ${timeLeft}s remaining`);
                return;
            }
            console.log(`🏁 Event ${event.eventId} has expired, processing...`);
            // Mark as ended FIRST (prevents re-processing)
            transaction.update(eventRef, {
                status: 'ended',
                processedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            // Pick winner if there are entries
            let winnerId;
            let winnerTicket;
            let rngSeed;
            if (event.totalEntries > 0) {
                console.log(`🎲 Picking winner from ${event.totalEntries} entries...`);
                const winnerData = await pickWinner(event.eventId, event.totalEntries);
                if (winnerData) {
                    winnerId = winnerData.winnerId;
                    winnerTicket = winnerData.winnerTicket;
                    rngSeed = winnerData.rngSeed;
                    // Calculate prize (70% of total entries)
                    const prizeAmount = Math.floor(event.totalEntries * event.entryCost * PRIZE_POOL_PERCENTAGE);
                    // Award prize (outside transaction to avoid conflicts)
                    // We'll do this after the transaction commits
                    // Update event with winner info
                    transaction.update(eventRef, {
                        winnerId,
                        winnerTicket,
                        rngSeed,
                        prizePool: prizeAmount // Update to actual prize awarded
                    });
                    console.log({
                        action: 'winner_selected',
                        eventId: event.eventId,
                        cycleNumber: event.cycleNumber,
                        winnerId,
                        winnerTicket,
                        totalEntries: event.totalEntries,
                        prizeAmount,
                        rngSeed,
                        timestamp: Date.now()
                    });
                }
            }
            else {
                console.log('📭 No entries for this event cycle');
            }
            // Archive to history
            const historyRef = db.collection('globalEvents').doc('history').collection('events').doc(event.eventId);
            const archivedEvent = Object.assign(Object.assign({}, event), { status: 'ended', processedAt: admin.firestore.FieldValue.serverTimestamp() });
            // Only add winner fields if they exist (avoid undefined values)
            if (winnerId !== undefined) {
                archivedEvent.winnerId = winnerId;
            }
            if (winnerTicket !== undefined) {
                archivedEvent.winnerTicket = winnerTicket;
            }
            if (rngSeed !== undefined) {
                archivedEvent.rngSeed = rngSeed;
            }
            transaction.set(historyRef, archivedEvent);
            // Create next event
            const nextEvent = createNewEvent((event.cycleNumber || 0) + 1);
            transaction.set(eventRef, nextEvent);
            console.log({
                action: 'cycle_completed',
                previousEventId: event.eventId,
                previousCycleNumber: event.cycleNumber,
                nextEventId: nextEvent.eventId,
                nextCycleNumber: nextEvent.cycleNumber,
                totalEntries: event.totalEntries,
                winnerId,
                timestamp: Date.now()
            });
            // Store winner info and event ID for cleanup after transaction
            return {
                winnerId,
                prizeAmount: event.prizePool,
                eventId: event.eventId,
                cycleNumber: event.cycleNumber,
                shouldClearEntries: true
            };
        }).then(async (result) => {
            // Award prize after transaction commits (if there was a winner)
            if (result && result.winnerId && result.prizeAmount > 0) {
                await awardPrize(result.winnerId, result.prizeAmount, result.eventId, result.cycleNumber);
            }
            // Clear old entries from the previous cycle (must be done outside transaction)
            if (result && result.shouldClearEntries) {
                await clearEventEntries();
            }
        });
        console.log('✅ Event cycle management completed successfully');
    }
    catch (error) {
        console.error('❌ Error managing event cycles:', error);
        // Log error for monitoring
        console.error({
            action: 'cycle_management_error',
            error: error.message,
            stack: error.stack,
            timestamp: Date.now()
        });
        throw error;
    }
});
//# sourceMappingURL=manageEventCycles.js.map