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
