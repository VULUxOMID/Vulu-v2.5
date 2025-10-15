import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Import event management functions ONLY (to avoid compilation errors in other modules)
import {
  enterEvent,
  manageEventCycles,
  getServerTime
} from './events';

// Export event functions
export {
  enterEvent,
  manageEventCycles,
  getServerTime
};

// Temporarily disabled other functions to fix compilation errors
// TODO: Re-enable after fixing TypeScript errors in other modules
