"use strict";
/**
 * Cloud Function for entering synchronized events
 * Handles event entries with idempotency, validation, and atomic gold deduction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.enterEvent = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();
/**
 * Enter Event
 * Callable function that handles event entries with:
 * - Idempotency key validation to prevent double-charging
 * - Event status and expiration validation
 * - User duplicate entry checking
 * - Atomic gold deduction
 * - Sequential ticket number assignment
 * - Aggregate counter updates (totalEntries, prizePool)
 */
exports.enterEvent = functions.https.onCall(async (data, context) => {
    try {
        // Verify user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated to enter event');
        }
        const uid = context.auth.uid;
        const { eventId, idempotencyKey } = data;
        // Validate input
        if (!eventId || !idempotencyKey) {
            throw new functions.https.HttpsError('invalid-argument', 'eventId and idempotencyKey are required');
        }
        // Run transaction to ensure atomicity
        const result = await db.runTransaction(async (transaction) => {
            const eventRef = db.collection('globalEvents').doc(eventId);
            const entriesRef = eventRef.collection('entries');
            const userBalanceRef = db.collection('users').doc(uid);
            // 1. Check if idempotency key already used (prevent double-tap)
            const idempotencyQuery = await entriesRef
                .where('idempotencyKey', '==', idempotencyKey)
                .limit(1)
                .get();
            if (!idempotencyQuery.empty) {
                console.log({
                    action: 'event_entry_duplicate_idempotency',
                    userId: uid,
                    eventId,
                    idempotencyKey,
                    timestamp: Date.now()
                });
                return { alreadyEntered: true };
            }
            // 2. Get and validate event
            const eventDoc = await transaction.get(eventRef);
            if (!eventDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'Event not found');
            }
            const event = eventDoc.data();
            // Check if event is active
            if (event.status !== 'active') {
                throw new functions.https.HttpsError('failed-precondition', 'Event has ended');
            }
            // Check if event has expired
            const now = Date.now();
            const endTime = event.endTime.toMillis();
            if (endTime <= now) {
                throw new functions.https.HttpsError('failed-precondition', 'Event has expired');
            }
            // 3. Check if user has already entered this cycle
            const userEntryDoc = await transaction.get(entriesRef.doc(uid));
            if (userEntryDoc.exists) {
                throw new functions.https.HttpsError('already-exists', 'You have already entered this event');
            }
            // 4. Check user's gold balance
            const userDoc = await transaction.get(userBalanceRef);
            if (!userDoc.exists) {
                throw new functions.https.HttpsError('not-found', 'User profile not found');
            }
            const userData = userDoc.data();
            const currencyBalances = userData.currencyBalances || { gold: 0, gems: 0, tokens: 0 };
            const currentGold = currencyBalances.gold || 0;
            if (currentGold < event.entryCost) {
                throw new functions.https.HttpsError('failed-precondition', `Insufficient gold. You need ${event.entryCost} gold to enter.`);
            }
            // 5. Assign sequential ticket number
            const ticketNumber = event.totalEntries || 0;
            // 6. Deduct gold from user balance
            const newGoldBalance = currentGold - event.entryCost;
            transaction.update(userBalanceRef, {
                'currencyBalances.gold': newGoldBalance,
                'currencyBalances.lastUpdated': admin.firestore.FieldValue.serverTimestamp()
            });
            // 7. Create transaction record for gold deduction
            const transactionRef = db.collection('transactions').doc();
            transaction.set(transactionRef, {
                userId: uid,
                type: 'spend',
                currencyType: 'gold',
                amount: -event.entryCost,
                balanceAfter: newGoldBalance,
                description: `Event entry - Cycle ${event.cycleNumber}`,
                metadata: {
                    eventId: event.eventId,
                    cycleNumber: event.cycleNumber,
                    ticketNumber
                },
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            // 8. Write entry with idempotency key
            transaction.set(entriesRef.doc(uid), {
                userId: uid,
                ticketNumber,
                entryTime: admin.firestore.FieldValue.serverTimestamp(),
                goldPaid: event.entryCost,
                idempotencyKey
            });
            // 9. Update event aggregates atomically
            transaction.update(eventRef, {
                totalEntries: admin.firestore.FieldValue.increment(1),
                prizePool: admin.firestore.FieldValue.increment(event.entryCost)
            });
            // Log successful entry
            console.log({
                action: 'event_entry_success',
                eventId: event.eventId,
                cycleNumber: event.cycleNumber,
                userId: uid,
                ticketNumber,
                goldPaid: event.entryCost,
                newGoldBalance,
                timestamp: Date.now()
            });
            return {
                success: true,
                ticketNumber
            };
        });
        return result;
    }
    catch (error) {
        console.error('Error entering event:', error);
        // Re-throw HttpsErrors
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        // Wrap other errors
        throw new functions.https.HttpsError('internal', `Failed to enter event: ${error.message}`);
    }
});
//# sourceMappingURL=enterEvent.js.map