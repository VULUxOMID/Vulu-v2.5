## Objectives

* Build a simple, reliable audio live system: initialize, join, leave.

* Keep secrets server‑side; client uses only App ID and server token.

* One button flow that “just works” on physical devices.

## Architecture

* Backend: Firebase Functions issue RTC tokens using Agora App ID/Certificate.

* Frontend: thin wrapper around `react-native-agora` to init/join/leave.

* UI: Go Live button triggers host join; simple status banner; optional viewer join.

## Backend (Firebase Functions)

1. Token function

   * Keep or recreate `generateAgoraToken({ channelName, uid, role })` using `agora-access-token`.

   * Reads `functions.config().agora.app_id` and `agora.app_certificate`.

   * Returns `{ token, appId, channelName, uid, expiresAt }`.
2. Config & deploy

   * Set: `firebase functions:config:set agora.app_id="78578ec9066d41a9945710a36f2091b1" agora.app_certificate="08ebc10bc06c45cbbfe4eb1ea6695b49"`.

   * Deploy: `firebase deploy --only functions`.
3. (Phase 2) Optional `renewAgoraToken` for auto‑renew.

## Frontend (Minimal SDK Layer)

1. Re‑add Agora SDK

   * Add `react-native-agora@^4.5.3` (native build; not Expo Go).
2. Service: `src/services/liveAgora.ts`

   * `initialize(appId)` → create engine, `initialize({ appId })`, set channel profile LiveBroadcasting, set client role.

   * `join(channel, uid, role, token)` → call `joinChannel`, register listeners: `JoinChannelSuccess`, `ConnectionStateChanged`, `Error`, `UserJoined`, `UserOffline`.

   * `leave()` → clean leave, destroy engine on app exit.

   * Handles ERR\_NOT\_READY (-7) as non‑fatal; 15s join timeout.
3. Token client: `src/services/liveToken.ts`

   * `getToken(channel, uid, role)` → Firebase callable to `generateAgoraToken`.
4. UID helper: stable numeric from user id; ensure non‑zero.

## UI Flow

1. Go Live (host)

   * Ensure signed‑in user.

   * `channel = live_<uid>_<timestamp>`; `uid = hash(user.uid)`.

   * `initialize(appId)` → `token = getToken(channel, uid, 'host')` → `join(channel, uid, 'host', token)`.

   * Show status (connecting/connected/error), participant count from events.
2. Join Stream (audience) (optional)

   * Given `channel`, `uid = hash(user.uid)` → `getToken(channel, uid, 'audience')` → `join(..., 'audience', token)`.
3. Leave

   * Call `leave()`, clear UI state.

## UI Component

* `src/components/live/LiveAudio.tsx`

  * Props: `{ channel: string, isHost: boolean }`.

  * On mount: init+token+join; render connection state and simple participant count.

  * No video views; audio‑only to reduce complexity.

## Integration

* Update `LiveStreamGrid` Go Live handler:

  * Create channel+uid, call minimal services, render `LiveAudio` screen/modal.

* Keep `LiveStreamContext` as no‑op (already stubbed) to avoid residual coupling.

## Reliability & Constraints

* Physical device only; block simulators with a clear message.

* Tunnel or LAN dev server; use development build (not Expo Go).

* 15s join timeout; resolve on `JoinChannelSuccess` or `ConnectionStateChanged Connected` fallback.

## Security

* App Certificate only in Functions config; never in client.

* Client uses App ID from `EXPO_PUBLIC_AGORA_APP_ID` and token from backend.

## Validation Plan

* Device build (iOS/Android) + tunnel.

* Host flow: press Go Live → observe `JoinChannelSuccess`, `Connected`; participant joins as audience and is visible.

* Error scenarios: missing token, network timeout, permission rejection; display friendly alerts.

## Milestones

* M1: Re‑add Agora SDK, implement `liveAgora.ts` and `liveToken.ts`.

* M2: Implement `LiveAudio` component and wire Go Live button.

* M3: Configure Functions, deploy, on‑device end‑to‑end test.

* M4: (Optional) Auto token renewal + simple Firestore discovery.

## Deliverables

* Minimal code in `src/services/liveAgora.ts`, `src/services/liveToken.ts`, `src/components/live/LiveAudio.tsx`.

* Go Live button wired to the minimal flow.

* Verified on a physical device with your credentials.

