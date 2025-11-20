# Web Support Fixes

## Summary
Fixed issues preventing the app from running on the web browser. The main issues were related to missing or misplaced platform-specific files for Agora (live streaming) and Voice Messages.

## Changes Made

1.  **Fixed `liveAgora` Service**:
    - Moved `src/services/liveAgora.web.ts` to `src/services/liveAgora/liveAgora.web.ts` to match the import path in `index.ts`.
    - Implemented a mock `LiveAgora` class for web to prevent crashes, as the native Agora SDK is not supported on web.
    - The mock implementation logs actions to the console and simulates successful joins, allowing the UI to function without errors.

2.  **Fixed `voiceMessageService`**:
    - Moved `src/services/voiceMessageService.web.ts` to `src/services/voiceMessageService/voiceMessageService.web.ts` to match the import path in `index.ts`.
    - Verified that the web implementation uses `MediaRecorder` API, which is supported in modern browsers.

3.  **Verified Configuration**:
    - Checked `package.json`, `app.json`, `metro.config.js`, and `babel.config.js` for web compatibility.
    - Verified `firebase.ts` and `permissionService.ts` handle web platform correctly.

## How to Run on Web
You can now run the app on the browser using:
```bash
npm run web
```
or
```bash
npx expo start --web
```

## Limitations
- **Live Streaming**: On web, live streaming is currently mocked. You will see the UI and "join" the channel, but no actual video/audio will be transmitted. To enable real streaming on web, the `agora-rtc-sdk-ng` library would need to be integrated.
- **Push Notifications**: Web push notifications are disabled/mocked as they require different configuration than native.
