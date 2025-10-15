"use strict";
/**
 * Cloud Function to get server time for client-side offset calculation
 * This helps ensure accurate countdown timers across all clients
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServerTime = void 0;
const functions = require("firebase-functions");
/**
 * Get Server Time
 * Returns the current server timestamp in milliseconds
 * Used by clients to calculate server-time offset for accurate countdowns
 */
exports.getServerTime = functions.https.onCall(async (data, context) => {
    var _a;
    try {
        const serverTime = Date.now();
        console.log({
            action: 'get_server_time',
            serverTime,
            userId: ((_a = context.auth) === null || _a === void 0 ? void 0 : _a.uid) || 'anonymous',
            timestamp: new Date().toISOString()
        });
        return {
            serverTime
        };
    }
    catch (error) {
        console.error('Error getting server time:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get server time');
    }
});
//# sourceMappingURL=getServerTime.js.map