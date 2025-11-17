## What You’re Seeing
There are still references and screens tied to the old live system (imports and routes) even though the core services/components were deleted. We’ll fully remove or stub these so no live UI shows up until we add the minimal working implementation.

## Phase 1 — Clean Up Residual Evidence
### Remove or Stub Files That Reference Deleted Services
- Screens:
  - `src/screens/LiveStreamView.tsx` (imports `streamingService`, `agoraService`) → remove or stub to a simple placeholder screen.
  - `src/screens/LiveStreamViewSimple.tsx` → remove (relies on `AgoraStreamView`).
  - `src/screens/LiveScreen.tsx` → remove or stub.
- Contexts:
  - `src/contexts/StreamConnectionContext.tsx` (uses `agoraService`) → remove or return a no-op provider.
- Utilities & Tests (move out or delete):
  - `src/utils/streamingTestUtils.ts`, `src/utils/testStreamManagement.ts`, `src/utils/streamLifecycleManager.ts`, `src/utils/streamCleanupUtility.ts`, `src/utils/debugStreamTest.ts`, `src/utils/debugPhantomStreams.ts`, `src/components/FirebaseConnectionTest.tsx` → delete or move to a `legacy/` folder.

### Navigation & UI
- Remove any tabs/routes that point to the above live screens.
- Ensure components do not render live badges, participant counts, or host controls.
- Keep `LiveStreamGrid` showing the Go Live button only; on press, show “Live disabled” until we re-enable.

## Phase 2 — Minimal Working Live (Audio-Only)
### Backend
- Keep a single callable function:
  - `generateAgoraToken({ channelName, uid, role }) → { token, appId, channelName, uid, expiresAt }`
  - Reads `functions.config().agora.app_id` and `app_certificate`.
  - Deploy with your credentials.

### Frontend
- New minimal wrapper: `src/services/agora.ts`
  - `initialize(appId)` → sets channel profile LiveBroadcasting; client role.
  - `join(channel, uid, role, token)` → handles events `JoinChannelSuccess`, `ConnectionStateChanged`, `Error`.
  - `leave()` → cleanly leave.
- Token client: `src/services/agoraToken.ts` → Firebase callable to get token.
- Simple UI: `src/components/live/LiveAudio.tsx` showing connection state and a participant count (from events).
- Go Live handler:
  - Build `channel = live_<uid>_<timestamp>`; request token; `initialize` → `join` as host.
  - Viewer taps can join as audience.

### Device Build & Run
- Use development build (not Expo Go) and tunnel mode.
- Physical device required; block simulators.

## Phase 3 — Optional Enhancements
- Token auto-renew at T-5 minutes.
- Write `streams/<channel>` to Firestore for discovery.
- Lightweight moderation (mute/ban list) later.

## Deliverables
- Phase 1: Residual live files removed/stubbed; navigation updated; no live UI remnants.
- Phase 2: Minimal working audio live with one button and simple status.

Confirm and I’ll perform Phase 1 cleanup first, then add the minimal live implementation and validate on-device.