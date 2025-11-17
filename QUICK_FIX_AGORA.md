# Agora ERR_NOT_READY Quick Fix 🚀

## TL;DR

**Problem:** Agora returns error `-7` (ERR_NOT_READY) on iOS Simulator  
**Cause:** Agora SDK doesn't work on simulators - needs real hardware  
**Fix:** Test on a real iPhone

## One Command Fix

```bash
# Connect your iPhone via USB, then run:
npx expo run:ios --device
```

## Why This Happens

Your Agora setup is **100% correct**:
- ✅ Credentials configured
- ✅ Real SDK loaded
- ✅ Engine creates successfully

But **Agora requires physical device hardware** for audio processing. Simulators can't provide this.

## What I Changed

Added simulator detection in `agoraService.ts` so you'll get a clear error message:

```
❌ Agora SDK does not support iOS/Android Simulators
📱 Please test on a REAL DEVICE for audio streaming to work  
💡 Run: npx expo run:ios --device
```

## Your Status

From your logs:
```
Platform: iOS Simulator ❌  
Agora Credentials: Configured ✅
Agora SDK: Real (not mock) ✅
Error: ERR_NOT_READY (-7) - Expected on simulator ⚠️
```

**Next Step:** Connect iPhone → Run command above → Audio streaming will work!

## No iPhone Available?

Use EAS Build to create an installable build:

```bash
eas build --profile development --platform ios
# Install via TestFlight or direct download
```

---

**Read `AGORA_SIMULATOR_ISSUE_FIX.md` for full details**

