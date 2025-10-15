"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServerTime = exports.manageEventCycles = exports.enterEvent = void 0;
const admin = require("firebase-admin");
// Initialize Firebase Admin
admin.initializeApp();
// Import event management functions ONLY (to avoid compilation errors in other modules)
const events_1 = require("./events");
Object.defineProperty(exports, "enterEvent", { enumerable: true, get: function () { return events_1.enterEvent; } });
Object.defineProperty(exports, "manageEventCycles", { enumerable: true, get: function () { return events_1.manageEventCycles; } });
Object.defineProperty(exports, "getServerTime", { enumerable: true, get: function () { return events_1.getServerTime; } });
// Temporarily disabled other functions to fix compilation errors
// TODO: Re-enable after fixing TypeScript errors in other modules
//# sourceMappingURL=index.js.map