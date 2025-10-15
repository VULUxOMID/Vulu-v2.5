# Auth Logout on App Close - Debugging Guide

## What I Added
Added a diagnostic log that runs **every time your app starts** to check if auth persistence is working.

## What to Do Next

### 1. Rebuild and Install the App
Since I modified the code, you need to rebuild:
```bash
# Stop the current dev server (Ctrl+C)
npx expo start --clear
```
Then reinstall on your device/simulator.

### 2. Test the Flow
1. **Sign in** to your app
2. **Check the logs** - you should see:
   ```
   🔍 Auth persistence status after sign-in: { ... }
   ```
   - If it says `asyncStorageWorks: false` → **AsyncStorage is broken on your device**
   - If it says `persistedDataFound: false` → **Auth data not being saved**

3. **Close the app completely** (swipe away from app switcher)
4. **Reopen the app**
5. **Check the logs again** - you should see:
   ```
   🔍 Auth persistence on startup: { ... }
   ```
   - If `currentUser: null` → **Auth was not restored** (this is your problem)
   - If `asyncStorageWorks: false` → **AsyncStorage failing on device**

### 3. Share the Logs
After you do steps 1-2 above, copy the console logs and share them with me. Look for these specific lines:
- `🔍 Auth persistence on startup:`
- `🔍 Auth persistence status after sign-in:`
- `✅ Firebase Auth initialized with AsyncStorage persistence`
- `⚠️ WARNING: AsyncStorage not working!` (if present)

## Most Likely Causes

### Cause 1: Old Build (Most Common)
**Symptom:** You're running an older TestFlight/build that had the session-only auth fallback bug.

**Fix:** Make sure you're running the latest build with the changes I just made.

### Cause 2: AsyncStorage Failing on Device
**Symptom:** Logs show `asyncStorageWorks: false`

**Fix:** This is a device/OS issue. Try:
- Restart your device
- Reinstall the app completely
- Check iOS Settings → [Your App] → Storage permissions

### Cause 3: Session Service Auto-Logout (Already Disabled)
**Status:** ✅ Already fixed - `enableAutoLogout: false` in the code

### Cause 4: Explicit signOut() Call Somewhere
**Symptom:** Logs show auth restored, then immediately signed out

**Fix:** We'd need to search for where `signOut()` is being called unexpectedly.

## Quick Questions to Help Diagnose

1. **What device/OS?** (iOS 17? Android 14? Simulator?)
2. **How are you closing the app?**
   - Force quit (swipe away from app switcher)?
   - Just pressing home button?
   - Leaving it in background for hours?
3. **Are you on the latest build?** (After my changes above)
4. **What do the logs show?** (Share the 🔍 lines)

## Current Code Status

✅ **Firebase Auth** uses AsyncStorage persistence (survives app restarts)
✅ **Auto-logout** is disabled (won't sign you out on background)
✅ **Cache clears** preserve Firebase auth keys
✅ **Startup diagnostic** added (will tell us what's failing)
✅ **Sign-in diagnostic** already present (checks persistence after login)

## Next Steps After You Share Logs

Once you share the diagnostic logs, I'll know exactly which of the 4 causes above is the issue and give you the precise fix.

