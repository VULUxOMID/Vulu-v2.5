"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupExpiredTokens = exports.validateAgoraToken = exports.renewAgoraToken = exports.generateAgoraToken = exports.getServerTime = exports.manageEventCycles = exports.enterEvent = void 0;
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
//# sourceMappingURL=index.js.map