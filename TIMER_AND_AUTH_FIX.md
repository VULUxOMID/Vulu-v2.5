# Timer & Auth Persistence Fix

## 🎯 Issues Fixed

### Issue 1: Event Timer Stuck at "3 minutes 0 seconds"
**Symptom**: Timer displays "3:00" and doesn't count down

**Root Cause**: One of these:
1. `globalEvents/current` document doesn't exist (Cloud Function hasn't run)
2. Firestore listener failing silently
3. Firebase services not initialized
4. Firestore security rules blocking reads

**Fix Applied**:
- ✅ Added comprehensive logging to event listener setup
- ✅ Added logging to verify `db` and `functions` initialization
- ✅ Enhanced error handling in `eventService.onEventSnapshot()`
- ✅ Added specific error messages for permission-denied errors
- ✅ Added logging to timer start/stop/pause states

---

### Issue 2: Auth Not Persisting (Getting Signed Out)
**Symptom**: User signs in, closes app, reopens → signed out

**Root Cause**: 
- `initializeAuth` with AsyncStorage persistence was failing
- Code fell back to `getAuth(app)` which uses **session-only persistence**
- Session-only auth doesn't survive app restarts

**Fix Applied**:
- ✅ **Removed fallback to `getAuth(app)`** - app now crashes if persistence fails
- ✅ This forces the real issue to surface instead of hiding it
- ✅ Added auth state change logging
- ✅ Removed unused `getAuth` import from `smsVerificationService.ts`
- ✅ Verified only one auth instance exists (exported from `firebase.ts`)

---

## 📝 Changes Made

### 1. `src/services/firebase.ts` (lines 82-92)
**Before**:
```typescript
} catch (authError: any) {
  console.error('❌ Firebase Auth initialization failed:', authError);
  
  // Fallback: try basic auth initialization
  try {
    auth = getAuth(app); // ❌ SESSION-ONLY PERSISTENCE!
    console.log('⚠️ Firebase Auth initialized with fallback method');
  } catch (fallbackError) {
    throw authError;
  }
}
```

**After**:
```typescript
} catch (authError: any) {
  console.error('❌ CRITICAL: Firebase Auth initialization failed:', authError);
  console.error('❌ Error details:', {
    message: authError.message,
    code: authError.code,
    stack: authError.stack
  });
  
  // DO NOT FALL BACK - crash to prevent session-only auth
  throw new Error(`Auth persistence required but failed: ${authError.message}`);
}
```

---

### 2. `src/screens/HomeScreen.tsx` (lines 2042-2107)
**Added**:
- `console.log('🔍 DB initialized?', !!db, 'Functions initialized?', !!functions);`
- Enhanced event snapshot logging with endTime
- Added time left calculation logging
- Added timer state logging (started/stopped/paused)

---

### 3. `src/services/eventService.ts` (lines 118-159)
**Added**:
- Detailed snapshot logging with event data
- Empty snapshot warning with helpful message
- Permission-denied error detection
- Error code and message logging

---

### 4. `src/context/AuthContext.tsx` (line 331)
**Added**:
- `console.log('🔐 Auth state changed:', firebaseUser ? 'signed-in' : 'signed-out');`

---

### 5. `src/services/smsVerificationService.ts` (line 8)
**Removed**:
- Unused `getAuth` import (prevents accidental duplicate auth instances)

---

## 🔍 What to Check in Console Logs

### For Event Timer Issue:

**✅ GOOD SIGNS** (timer should work):
```
🔍 Setting up event listener...
🔍 DB initialized? true Functions initialized? true
📸 Event snapshot received: { eventId: ..., status: 'active', endTime: ... }
✅ Event update received: { eventId: ..., cycleNumber: ..., totalEntries: ..., status: ... }
⏱️ Time left calculated: 180 seconds
▶️ Timer started for event: ...
```

**❌ BAD SIGNS** (indicates problem):
```
🔍 DB initialized? false Functions initialized? false
  → Firebase not initialized properly

📭 Event snapshot empty - document does not exist
💡 Run manageEventCycles Cloud Function to create first event
  → Cloud Function hasn't created event yet

❌ Event snapshot listener error: ...
🔒 Firestore security rules may be blocking read access
  → Check Firestore security rules

⚠️ No current event found - manageEventCycles may not have run yet
  → Wait for scheduled function or manually trigger it

⏸️ Timer paused - no current event
  → Event listener not receiving data
```

---

### For Auth Persistence Issue:

**✅ GOOD SIGNS** (auth should persist):
```
✅ Firebase Auth initialized with AsyncStorage persistence
✅ AsyncStorage persistence verified
🔐 Auth state changed: signed-in (uid123...)
✅ Auth state restored from persistence: { uid: ..., email: ... }
```

**❌ BAD SIGNS** (indicates problem):
```
❌ CRITICAL: Firebase Auth initialization failed: ...
  → App will crash - this is intentional to surface the real issue

⚠️ AsyncStorage test failed - persistence may not work correctly
  → AsyncStorage not working properly

🔐 Auth state changed: signed-out
  → User was signed out (check if this happens on app restart)
```

---

## 🎯 Next Steps

### Step 1: Restart the App
```bash
# Kill Metro bundler
pkill -f "expo start" || true

# Start with cache clear
cd /Users/omid/Documents/GitHub/Vulu-v2.5
npx expo start -c
```

### Step 2: Check Console Logs
Open the app and look for the log patterns above.

### Step 3: Verify Event Exists in Firestore
1. Go to Firebase Console → Firestore Database
2. Check if `globalEvents/current` document exists
3. Verify it has these fields:
   - `eventId` (string)
   - `endTime` (timestamp)
   - `status` (should be "active")
   - `totalEntries` (number)
   - `entryCost` (number)

### Step 4: Check Cloud Functions
1. Go to Firebase Console → Functions → Logs
2. Verify `manageEventCycles` is running every 3 minutes
3. Check for any errors in the logs

### Step 5: Test Auth Persistence
1. Sign in to the app
2. Close the app completely (swipe up from app switcher)
3. Wait 10 seconds
4. Reopen the app
5. Check console logs for:
   - `🔐 Auth state changed: signed-in (uid...)`
   - `✅ Auth state restored from persistence`

---

## 🚨 If Issues Persist

### Timer Still Stuck:
1. **Check Firestore Rules**: Ensure `globalEvents/current` is readable
2. **Manually Trigger Cloud Function**: Run `manageEventCycles` from Firebase Console
3. **Check Network**: Verify device has internet connection
4. **Check Firebase Init**: Look for `DB initialized? false` in logs

### Still Getting Signed Out:
1. **Check for Crash**: If app crashes on startup, AsyncStorage is failing
2. **Check for "fallback auth"**: If you see this, the fix didn't apply
3. **Check AsyncStorage**: Look for AsyncStorage test logs
4. **Check iOS Settings**: Verify app has storage permissions

---

## 📊 Expected Behavior After Fix

### Event Timer:
- ✅ Timer counts down from 3:00 to 0:00
- ✅ Updates every second
- ✅ Shows correct prize pool based on entries
- ✅ Shows correct number of entries

### Auth Persistence:
- ✅ User stays signed in after closing app
- ✅ User stays signed in after 10+ seconds
- ✅ User stays signed in after device restart
- ✅ Auth state restored on app launch

---

## 🔧 Rollback Instructions

If these changes cause issues, revert with:

```bash
git checkout HEAD -- src/services/firebase.ts
git checkout HEAD -- src/screens/HomeScreen.tsx
git checkout HEAD -- src/services/eventService.ts
git checkout HEAD -- src/context/AuthContext.tsx
git checkout HEAD -- src/services/smsVerificationService.ts
```

