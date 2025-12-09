import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Import event management functions
import {
  enterEvent,
  manageEventCycles,
  getServerTime
} from './events';

// Import Agora token management functions
import {
  generateAgoraToken,
  renewAgoraToken,
  validateAgoraToken,
  cleanupExpiredTokens
} from './agoraTokenManagement';

// Import notification functions
import {
  sendPushNotification,
  sendBulkNotifications,
  processNotificationReceipts,
  cleanupNotificationData
} from './notificationFunctions';

// Import payment functions
import {
  purchaseGems,
  handleStripeWebhook,
  processRevenueSharing,
  generateFinancialReport
} from './paymentFunctions';

// Import recording functions
import {
  startCloudRecording,
  stopCloudRecording,
  processRecording,
  processRecordingHighlight,
  cleanupOldRecordings
} from './recordingFunctions';

// Import performance functions
import {
  generateStreamQualityReport
} from './performanceFunctions';

// Export event functions
export {
  enterEvent,
  manageEventCycles,
  getServerTime
};

// Export Agora token functions
export {
  generateAgoraToken,
  renewAgoraToken,
  validateAgoraToken,
  cleanupExpiredTokens
};

// Export notification functions
export {
  sendPushNotification,
  sendBulkNotifications,
  processNotificationReceipts,
  cleanupNotificationData
};

// Export payment functions
export {
  purchaseGems,
  handleStripeWebhook,
  processRevenueSharing,
  generateFinancialReport
};

// Export recording functions
export {
  startCloudRecording,
  stopCloudRecording,
  processRecording,
  processRecordingHighlight,
  cleanupOldRecordings
};

// Export performance functions
export {
  generateStreamQualityReport
};
