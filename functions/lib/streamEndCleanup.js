"use strict";
/**
 * Stream End Cleanup Cloud Function
 * Ends a stream and clears participants' activeStream records server-side.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.endStreamAndCleanup = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();
exports.endStreamAndCleanup = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { streamId } = data || {};
        if (!streamId || typeof streamId !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'streamId is required');
        }
        // Fetch stream
        const streamRef = db.collection('streams').doc(streamId);
        const streamSnap = await streamRef.get();
        if (!streamSnap.exists) {
            throw new functions.https.HttpsError('not-found', 'Stream not found');
        }
        const streamData = streamSnap.data();
        // Authorization: only host can end/cleanup
        if (streamData.hostId !== context.auth.uid) {
            throw new functions.https.HttpsError('permission-denied', 'Only host can end the stream');
        }
        const participants = Array.isArray(streamData.participants)
            ? streamData.participants
            : [];
        // Perform cleanup in a batch
        const batch = db.batch();
        // Mark stream as ended
        batch.update(streamRef, {
            isActive: false,
            endedAt: admin.firestore.FieldValue.serverTimestamp(),
            endReason: 'host_end',
            participants: [],
            viewerCount: 0,
            lastActivity: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Clear each participant's activeStream/current
        for (const p of participants) {
            if (!(p === null || p === void 0 ? void 0 : p.id))
                continue;
            const activeRef = db.collection('users').doc(p.id).collection('activeStream').doc('current');
            batch.delete(activeRef);
        }
        await batch.commit();
        return { ok: true, cleared: participants.length };
    }
    catch (error) {
        console.error('endStreamAndCleanup error:', error);
        if (error instanceof functions.https.HttpsError)
            throw error;
        throw new functions.https.HttpsError('internal', (error === null || error === void 0 ? void 0 : error.message) || 'Unknown error');
    }
});
//# sourceMappingURL=streamEndCleanup.js.map