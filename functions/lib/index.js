"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateStreamQualityReport = exports.cleanupOldRecordings = exports.processRecordingHighlight = exports.processRecording = exports.stopCloudRecording = exports.startCloudRecording = exports.generateFinancialReport = exports.processRevenueSharing = exports.handleStripeWebhook = exports.purchaseGems = exports.cleanupNotificationData = exports.processNotificationReceipts = exports.sendBulkNotifications = exports.sendPushNotification = exports.cleanupExpiredTokens = exports.validateAgoraToken = exports.renewAgoraToken = exports.generateAgoraToken = exports.getServerTime = exports.manageEventCycles = exports.enterEvent = void 0;
const admin = require("firebase-admin");
// Initialize Firebase Admin
admin.initializeApp();
// Import event management functions
const events_1 = require("./events");
Object.defineProperty(exports, "enterEvent", { enumerable: true, get: function () { return events_1.enterEvent; } });
Object.defineProperty(exports, "manageEventCycles", { enumerable: true, get: function () { return events_1.manageEventCycles; } });
Object.defineProperty(exports, "getServerTime", { enumerable: true, get: function () { return events_1.getServerTime; } });
// Import Agora token management functions
const agoraTokenManagement_1 = require("./agoraTokenManagement");
Object.defineProperty(exports, "generateAgoraToken", { enumerable: true, get: function () { return agoraTokenManagement_1.generateAgoraToken; } });
Object.defineProperty(exports, "renewAgoraToken", { enumerable: true, get: function () { return agoraTokenManagement_1.renewAgoraToken; } });
Object.defineProperty(exports, "validateAgoraToken", { enumerable: true, get: function () { return agoraTokenManagement_1.validateAgoraToken; } });
Object.defineProperty(exports, "cleanupExpiredTokens", { enumerable: true, get: function () { return agoraTokenManagement_1.cleanupExpiredTokens; } });
// Import notification functions
const notificationFunctions_1 = require("./notificationFunctions");
Object.defineProperty(exports, "sendPushNotification", { enumerable: true, get: function () { return notificationFunctions_1.sendPushNotification; } });
Object.defineProperty(exports, "sendBulkNotifications", { enumerable: true, get: function () { return notificationFunctions_1.sendBulkNotifications; } });
Object.defineProperty(exports, "processNotificationReceipts", { enumerable: true, get: function () { return notificationFunctions_1.processNotificationReceipts; } });
Object.defineProperty(exports, "cleanupNotificationData", { enumerable: true, get: function () { return notificationFunctions_1.cleanupNotificationData; } });
// Import payment functions
const paymentFunctions_1 = require("./paymentFunctions");
Object.defineProperty(exports, "purchaseGems", { enumerable: true, get: function () { return paymentFunctions_1.purchaseGems; } });
Object.defineProperty(exports, "handleStripeWebhook", { enumerable: true, get: function () { return paymentFunctions_1.handleStripeWebhook; } });
Object.defineProperty(exports, "processRevenueSharing", { enumerable: true, get: function () { return paymentFunctions_1.processRevenueSharing; } });
Object.defineProperty(exports, "generateFinancialReport", { enumerable: true, get: function () { return paymentFunctions_1.generateFinancialReport; } });
// Import recording functions
const recordingFunctions_1 = require("./recordingFunctions");
Object.defineProperty(exports, "startCloudRecording", { enumerable: true, get: function () { return recordingFunctions_1.startCloudRecording; } });
Object.defineProperty(exports, "stopCloudRecording", { enumerable: true, get: function () { return recordingFunctions_1.stopCloudRecording; } });
Object.defineProperty(exports, "processRecording", { enumerable: true, get: function () { return recordingFunctions_1.processRecording; } });
Object.defineProperty(exports, "processRecordingHighlight", { enumerable: true, get: function () { return recordingFunctions_1.processRecordingHighlight; } });
Object.defineProperty(exports, "cleanupOldRecordings", { enumerable: true, get: function () { return recordingFunctions_1.cleanupOldRecordings; } });
// Import performance functions
const performanceFunctions_1 = require("./performanceFunctions");
Object.defineProperty(exports, "generateStreamQualityReport", { enumerable: true, get: function () { return performanceFunctions_1.generateStreamQualityReport; } });
//# sourceMappingURL=index.js.map