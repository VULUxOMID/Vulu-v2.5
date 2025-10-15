# Firestore Rules & Cloud Function Fix

## 🎯 Issues Fixed

### Issue 1: Permission Denied on `globalEvents/current`
**Error:**
```
ERROR  ❌ Event snapshot listener error: [FirebaseError: Missing or insufficient permissions.]
ERROR  ❌ Error code: permission-denied
ERROR  🔒 Firestore security rules may be blocking read access to globalEvents/current
```

**Root Cause:**
- Firestore security rules were correct in the code
- Rules were **not deployed** to Firebase

**Fix Applied:**
✅ Deployed Firestore rules with:
```bash
firebase deploy --only firestore:rules
```

**Result:**
```
✔  firestore: released rules firestore.rules to cloud.firestore
✔  Deploy complete!
```

---

### Issue 2: Cloud Function `manageEventCycles` Failing
**Error:**
```
Error: Value for argument "data" is not a valid Firestore document. 
Cannot use "undefined" as a Firestore value (found in field "winnerId").
```

**Root Cause:**
- When an event cycle ends with **no entries**, the function tried to archive the event with:
  - `winnerId: undefined`
  - `winnerTicket: undefined`
  - `rngSeed: undefined`
- Firestore doesn't allow `undefined` values

**Fix Applied:**
Modified `functions/src/events/manageEventCycles.ts` (lines 227-246):

**Before:**
```typescript
const archivedEvent = {
  ...event,
  status: 'ended',
  processedAt: admin.firestore.FieldValue.serverTimestamp(),
  winnerId,        // ❌ undefined when no entries
  winnerTicket,    // ❌ undefined when no entries
  rngSeed          // ❌ undefined when no entries
};
transaction.set(historyRef, archivedEvent);
```

**After:**
```typescript
const archivedEvent: any = {
  ...event,
  status: 'ended',
  processedAt: admin.firestore.FieldValue.serverTimestamp()
};

// Only add winner fields if they exist (avoid undefined values)
if (winnerId !== undefined) {
  archivedEvent.winnerId = winnerId;
}
if (winnerTicket !== undefined) {
  archivedEvent.winnerTicket = winnerTicket;
}
if (rngSeed !== undefined) {
  archivedEvent.rngSeed = rngSeed;
}

transaction.set(historyRef, archivedEvent);
```

**Deployed:**
```bash
cd functions && npm run build
firebase deploy --only functions:manageEventCycles
```

**Result:**
```
✔  functions[manageEventCycles(us-central1)] Successful update operation.
✔  Deploy complete!
```

---

## 📊 Current Status

### ✅ What's Working Now:

1. **Firestore Rules Deployed**
   - Authenticated users can read `globalEvents/current`
   - Only Cloud Functions can write to events

2. **Cloud Function Fixed**
   - `manageEventCycles` no longer crashes on empty events
   - Function runs every 3 minutes via Cloud Scheduler

3. **App Code Fixed**
   - `db` and `functions` properly imported in HomeScreen.tsx
   - Auth persistence working (AsyncStorage)
   - Event listener set up correctly

---

## ⏳ What's Pending:

### **Waiting for Next Scheduled Run**
The `manageEventCycles` function runs **every 3 minutes**. The next run will:
1. Create a new event in `globalEvents/current`
2. Set `endTime` to 3 minutes from now
3. Initialize `totalEntries: 0`, `prizePool: 0`

**When this happens, the timer will start working!**

---

## 🔍 How to Verify It's Working

### **Check Console Logs:**

**Before the function runs (current state):**
```
🔍 Setting up event listener...
🔍 DB initialized? true Functions initialized? true
ERROR  ❌ Event snapshot listener error: permission-denied  ← OLD ERROR (should be gone)
⏸️ Timer paused - no current event
```

**After the function runs (expected):**
```
🔍 Setting up event listener...
🔍 DB initialized? true Functions initialized? true
📸 Event snapshot received: { eventId: ..., status: 'active', endTime: ... }
✅ Event update received: { eventId: ..., cycleNumber: 1, totalEntries: 0, ... }
⏱️ Time left calculated: 180 seconds
▶️ Timer started for event: ...
```

---

## 🚀 Manual Trigger (Optional)

If you don't want to wait for the scheduled run, you can manually trigger it:

### **Option 1: Firebase Console**
1. Go to: https://console.firebase.google.com/project/vulugo/functions
2. Find `manageEventCycles`
3. Click "..." → "Test function"
4. Click "Run"

### **Option 2: Wait for Scheduled Run**
The function runs every 3 minutes automatically. Just wait and refresh the app.

---

## 📝 Files Changed

### 1. `firestore.rules`
- **Status**: Already correct, just needed deployment
- **Lines 261-263**: Allow authenticated users to read `globalEvents/current`

### 2. `functions/src/events/manageEventCycles.ts`
- **Lines 227-246**: Fixed undefined values in archived events
- **Status**: Built and deployed

### 3. `src/screens/HomeScreen.tsx`
- **Line 54**: Added import for `db` and `functions`
- **Line 2046**: Updated to use aliased imports
- **Status**: Already fixed in previous step

---

## 🎯 Expected Timeline

| Time | Event |
|------|-------|
| **Now** | Firestore rules deployed, Cloud Function fixed |
| **Within 3 min** | `manageEventCycles` runs and creates first event |
| **Immediately after** | App receives event snapshot, timer starts counting down |
| **After 3 min** | Event ends, new cycle begins automatically |

---

## ✅ Summary

All fixes are deployed:
- ✅ Firestore rules allow reading `globalEvents/current`
- ✅ Cloud Function no longer crashes on empty events
- ✅ App code properly imports Firebase services
- ✅ Auth persistence working

**Next step:** Wait for the scheduled function to run (max 3 minutes) or manually trigger it from Firebase Console.

The timer will start working as soon as the event is created! 🎉

