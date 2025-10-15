/**
 * Cloud Function to get server time for client-side offset calculation
 * This helps ensure accurate countdown timers across all clients
 */

import * as functions from 'firebase-functions';

/**
 * Get Server Time
 * Returns the current server timestamp in milliseconds
 * Used by clients to calculate server-time offset for accurate countdowns
 */
export const getServerTime = functions.https.onCall(async (data, context) => {
  try {
    const serverTime = Date.now();
    
    console.log({
      action: 'get_server_time',
      serverTime,
      userId: context.auth?.uid || 'anonymous',
      timestamp: new Date().toISOString()
    });
    
    return {
      serverTime
    };
  } catch (error: any) {
    console.error('Error getting server time:', error);
    
    throw new functions.https.HttpsError(
      'internal',
      'Failed to get server time'
    );
  }
});

