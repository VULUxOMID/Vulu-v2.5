# Synchronized Event Widget System - Implementation Guide

## Overview

This document describes the complete implementation of the synchronized event widget system for the Vulu app. The system provides a fair, server-authoritative event mechanism where all users see the same countdown, prize pool, and can enter events that are managed entirely by Cloud Functions.

## Architecture

### Data Model

#### `globalEvents/current` (Main Event Document)
```typescript
{
  eventId: string,              // e.g., "event_1234567890_cycle_42"
  cycleNumber: number,          // Sequential cycle counter
  startTime: Timestamp,         // Event start time
  endTime: Timestamp,           // Event end time
  entryCost: number,            // Cost to enter (100 gold)
  totalEntries: number,         // Total number of entries
  prizePool: number,            // Total prize pool
  status: 'active' | 'ended',   // Event status
  winnerId?: string,            // Winner's user ID (if ended)
  winnerTicket?: number,        // Winning ticket number
  processedAt?: Timestamp,      // When event was processed
  rngSeed?: string              // RNG seed for auditability
}
```

#### `globalEvents/current/entries/{userId}` (Entry Subcollection)
```typescript
{
  userId: string,               // User who entered
  ticketNumber: number,         // Sequential ticket (0, 1, 2, ...)
  entryTime: Timestamp,         // When user entered
  goldPaid: number,             // Amount paid (100 gold)
  idempotencyKey: string        // UUID to prevent double-charging
}
```

#### `globalEvents/history/events/{eventId}` (Archived Events)
Same structure as current event, stored for audit trail and leaderboards.

---

## Implementation Files

### 1. TypeScript Types (`src/types/event.ts`)
Defines all event-related interfaces and types:
- `Event` - Main event document structure
- `EventEntry` - Entry document structure
- `EventEntryResult` - Result from enterEvent Cloud Function
- `ServerTimeResponse` - Server time for offset calculation
- `EventConfig` - Configuration for staging vs production

### 2. Cloud Functions

#### `functions/src/events/enterEvent.ts`
**Callable Cloud Function** that handles event entries with:
- ✅ Idempotency key validation (prevents double-charging on retries)
- ✅ Event status and expiration validation
- ✅ User duplicate entry checking
- ✅ Atomic gold deduction
- ✅ Sequential ticket number assignment
- ✅ Aggregate counter updates (totalEntries, prizePool)

**Usage:**
```typescript
const result = await httpsCallable(functions, 'enterEvent')({
  eventId: 'current',
  idempotencyKey: 'uuid-v4-string'
});
```

#### `functions/src/events/manageEventCycles.ts`
**Scheduled Cloud Function** (Pub/Sub) that runs every 3 minutes (configurable):
- ✅ Idempotent guards (status === 'active' check)
- ✅ Picks winner using crypto-secure RNG with logged seed
- ✅ Awards prize via transaction
- ✅ Archives completed events to history
- ✅ Creates next event cycle atomically

**Schedule:** `every 3 minutes` (change to `every 3 hours` for production)

#### `functions/src/events/getServerTime.ts`
**Callable Cloud Function** that returns server timestamp for client-side offset calculation.

**Usage:**
```typescript
const result = await httpsCallable(functions, 'getServerTime')();
const serverTime = result.data.serverTime;
```

### 3. Event Service (`src/services/eventService.ts`)
Client-side service wrapper that provides:
- `calculateServerTimeOffset()` - Computes server-time offset for accurate countdown
- `getCurrentEvent()` - Fetches current event data
- `onEventSnapshot(callback)` - Real-time listener for event updates
- `enterEvent(idempotencyKey)` - Calls Cloud Function to enter event
- `getUserEntry(userId)` - Gets user's entry for current event
- `calculateTimeLeft(endTime)` - Computes time left using server offset
- `formatTime(seconds)` - Formats time as MM:SS
- `calculatePrizePool(totalEntries, entryCost)` - Calculates prize pool

### 4. HomeScreen Integration (`src/screens/HomeScreen.tsx`)
Updated to use Firestore-backed event system:
- ✅ Server time offset calculation on mount
- ✅ Real-time event listener via `onSnapshot`
- ✅ Countdown timer using server time (no drift)
- ✅ Entry handler calls Cloud Function with UUID idempotency key
- ✅ Loading states and error handling
- ✅ Displays real-time totalEntries and prizePool

### 5. Security Rules (`firestore.rules`)
Strict rules that ensure only Cloud Functions can modify events:
```javascript
match /globalEvents/current {
  allow read: if isAuthenticated();
  allow write: if false; // Only Cloud Functions
  
  match /entries/{userId} {
    allow read: if isAuthenticated();
    allow write: if false; // Only via enterEvent callable
  }
}
```

---

## Configuration

### Staging vs Production

**Staging (Current):**
- Cycle duration: 3 minutes
- Scheduler: `every 3 minutes`

**Production:**
To switch to production mode:

1. Update `functions/src/events/manageEventCycles.ts`:
```typescript
// Change line 11 from:
const CYCLE_DURATION_MS = 3 * 60 * 1000; // 3 minutes

// To:
const CYCLE_DURATION_MS = 3 * 60 * 60 * 1000; // 3 hours
```

2. Update scheduler (line 127):
```typescript
// Change from:
.schedule('every 3 minutes')

// To:
.schedule('every 3 hours')
```

3. Redeploy Cloud Functions:
```bash
cd functions
npm run build
firebase deploy --only functions
```

---

## Deployment Steps

### 1. Deploy Cloud Functions

```bash
cd functions
npm install
npm run build
firebase deploy --only functions:enterEvent,manageEventCycles,getServerTime
```

### 2. Deploy Security Rules

```bash
firebase deploy --only firestore:rules
```

### 3. Initialize First Event (Optional)

The `manageEventCycles` function will automatically create the first event on its first run. Alternatively, you can manually create it in Firestore Console:

**Collection:** `globalEvents`  
**Document ID:** `current`  
**Data:**
```json
{
  "eventId": "event_initial_cycle_0",
  "cycleNumber": 0,
  "startTime": <current timestamp>,
  "endTime": <current timestamp + 3 minutes>,
  "entryCost": 100,
  "totalEntries": 0,
  "prizePool": 0,
  "status": "active"
}
```

### 4. Test the System

1. **Check Cloud Functions are deployed:**
   ```bash
   firebase functions:list
   ```
   Should show: `enterEvent`, `manageEventCycles`, `getServerTime`

2. **Monitor Cloud Function logs:**
   ```bash
   firebase functions:log --only manageEventCycles
   ```

3. **Test event entry in app:**
   - Open HomeScreen
   - Tap on event widget
   - Tap "Enter" button
   - Verify gold is deducted
   - Check Firestore for entry document

---

## Key Features

### 1. Idempotency
- Every entry uses a UUID-based idempotency key
- Prevents double-charging on network retries or double-taps
- Server checks if key already exists before processing

### 2. Server Time Synchronization
- Client calculates server-time offset on app start
- Countdown uses server time to prevent drift
- All users see identical countdown

### 3. Fair Winner Selection
- Sequential ticket numbers (0, 1, 2, ...)
- Crypto-secure random number generation
- RNG seed logged for auditability
- O(1) winner lookup by ticket number

### 4. Atomic Operations
- All gold deductions and entry creation in single transaction
- Prevents race conditions
- Ensures consistency

### 5. Idempotent Cycle Management
- Scheduler can run multiple times safely
- Status guards prevent re-processing
- Creates next event only after marking current as ended

---

## Monitoring & Observability

### Structured Logging

All Cloud Functions log structured JSON for easy monitoring:

**Event Entry:**
```json
{
  "action": "event_entry_success",
  "eventId": "event_1234_cycle_5",
  "cycleNumber": 5,
  "userId": "user123",
  "ticketNumber": 7,
  "goldPaid": 100,
  "newGoldBalance": 450,
  "timestamp": 1234567890
}
```

**Cycle Completion:**
```json
{
  "action": "cycle_completed",
  "previousEventId": "event_1234_cycle_5",
  "previousCycleNumber": 5,
  "nextEventId": "event_5678_cycle_6",
  "nextCycleNumber": 6,
  "totalEntries": 15,
  "winnerId": "user456",
  "timestamp": 1234567890
}
```

### Firebase Console Monitoring

1. **Cloud Functions Dashboard:**
   - Monitor invocations, errors, execution time
   - Set up alerts for function failures

2. **Firestore Console:**
   - View current event in `globalEvents/current`
   - Check entries in subcollection
   - Review history in `globalEvents/history`

3. **Cloud Scheduler:**
   - Verify `manageEventCycles` is running on schedule
   - Check execution history

---

## Troubleshooting

### Event not appearing in app
- Check Firestore Console for `globalEvents/current` document
- Verify security rules allow read access
- Check HomeScreen console logs for listener errors

### Entry fails with "Insufficient gold"
- Verify user's gold balance in Firestore
- Check if gold was already deducted (idempotency)
- Review Cloud Function logs for transaction errors

### Winner not selected
- Check `manageEventCycles` logs for errors
- Verify scheduler is running (Cloud Scheduler console)
- Ensure event has `status: 'active'` and expired `endTime`

### Double-charging
- Should not happen due to idempotency keys
- If it does, check Cloud Function logs for duplicate idempotency keys
- Verify transaction logic in `enterEvent.ts`

---

## Future Enhancements

1. **Push Notifications:**
   - Notify users when they win
   - Remind users when event is about to end

2. **Leaderboards:**
   - Top winners from history
   - Most entries per user

3. **Admin Dashboard:**
   - View current event status
   - Manually trigger cycle (for testing)
   - View entry history

4. **Sharded Counters:**
   - If >100 entries/second, shard `totalEntries`/`prizePool`
   - Reduces write contention on event document

5. **Multiple Event Types:**
   - Different entry costs
   - Different cycle durations
   - Special events (holidays, etc.)

---

## Summary

The synchronized event widget system is now fully implemented with:
- ✅ Server-authoritative event management
- ✅ Real-time synchronization across all clients
- ✅ Idempotent entry handling
- ✅ Fair winner selection with auditability
- ✅ Atomic transactions preventing race conditions
- ✅ Accurate countdown using server time
- ✅ Comprehensive security rules
- ✅ Structured logging for monitoring

**Ready for testing in staging environment (3-minute cycles).**  
**Switch to production mode (3-hour cycles) when ready.**

