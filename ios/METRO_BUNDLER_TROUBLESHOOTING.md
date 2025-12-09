# Metro Bundler Connection Troubleshooting Guide

## Error: "No script URL provided... unsanitizedScriptURLString = (null)"

This error means `bundleURL()` returned `nil` - React Native has no URL to load JavaScript from.

---

## Quick Fix Checklist

### ✅ Step 1: Verify You're Running in DEBUG Mode

**In Xcode:**

1. **Check the Scheme:**
   - Top toolbar → Next to the Run button
   - Should show: `VULU > iPhone 15 Pro` (or your simulator/device)
   - Should NOT show: `Any iOS Device (Release)`

2. **Verify Build Configuration:**
   - Menu: **Product → Scheme → Edit Scheme...**
   - Select **Run** in the left sidebar
   - Under **Build Configuration**, ensure it's set to **Debug**
   - Click **Close**

3. **Clean Build:**
   - Menu: **Product → Clean Build Folder** (⇧⌘K)
   - Then rebuild: **Product → Build** (⌘B)

---

### ✅ Step 2: Start Metro Bundler

**From your project root directory:**

```bash
npm start
```

**OR:**

```bash
npx expo start --dev-client
```

**You should see:**
```
Metro waiting on exp://192.168.x.x:8081
```

**Keep this terminal window open** - Metro must be running for the app to load JavaScript.

---

### ✅ Step 3: Run the App

**Option A: From Xcode**
- Click the **Run** button (▶️) or press **⌘R**

**Option B: From Terminal**
```bash
npm run ios
```

---

## Understanding the Error Messages

### In DEBUG Mode (Development)

**✅ Success:**
```
✅ [AppDelegate] Metro bundler URL: http://localhost:8081/.expo/.virtual-metro-entry.bundle?platform=ios&dev=true
```

**⚠️ Warning (but should still work):**
```
⚠️ [AppDelegate] Using fallback Metro URL: http://localhost:8081/...
```
This means the automatic detection failed, but the fallback URL is being used.

**❌ Error:**
```
❌ [AppDelegate] CRITICAL: Could not construct Metro URL. Check that you're running in DEBUG mode and Metro is started.
```
This means you're likely running a Release build, or the DEBUG flag isn't set.

---

### In RELEASE Mode (Production/TestFlight)

**✅ Success:**
```
✅ [AppDelegate] Using bundled JS: file:///.../main.jsbundle
```

**❌ Error:**
```
❌ [AppDelegate] RELEASE BUILD ERROR: main.jsbundle not found. You must bundle JS for Release builds.
```

**Fix for Release builds:**
You need to create `main.jsbundle` before building for Release. This is typically done automatically by Expo/React Native build scripts, but if it's missing:

1. Add a "Bundle React Native code and images" build phase in Xcode
2. Or use: `npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ios/main.jsbundle`

---

## Common Issues & Solutions

### Issue 1: "No script URL provided" in Debug Mode

**Cause:** Running Release build, or DEBUG flag not set.

**Solution:**
1. Check Xcode scheme (see Step 1 above)
2. Clean build folder (⇧⌘K)
3. Rebuild in Debug mode

---

### Issue 2: "Could not connect to development server"

**Cause:** Metro bundler is not running, or wrong URL.

**Solution:**
1. Start Metro: `npm start` (see Step 2 above)
2. Check that Metro shows: `Metro waiting on exp://...`
3. For physical devices: Ensure device and Mac are on same Wi-Fi network
4. Check firewall isn't blocking port 8081

---

### Issue 3: App connects but shows blank screen

**Cause:** JavaScript bundle failed to load or has errors.

**Solution:**
1. Check Metro terminal for JavaScript errors
2. Check Xcode console for React Native errors
3. Try: `npm start -- --reset-cache`

---

### Issue 4: Works on Simulator but not Physical Device

**Cause:** Network/IP address detection issue.

**Solution:**
1. Ensure device and Mac are on same Wi-Fi network
2. Find your Mac's IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
3. Start Metro with explicit host: `expo start --host <your-mac-ip>`
4. Shake device → "Configure Bundler" → Enter your Mac's IP

---

## Verification Steps

After following the checklist, verify:

1. **Xcode Console shows:**
   ```
   ✅ [AppDelegate] Metro bundler URL: http://...
   ```

2. **Metro Terminal shows:**
   ```
   BUNDLE  ./index.js
   ```

3. **App loads successfully** (no red error screen)

---

## Still Having Issues?

1. **Clear all caches:**
   ```bash
   rm -rf ~/Library/Developer/Xcode/DerivedData
   npm start -- --reset-cache
   ```

2. **Reinstall pods:**
   ```bash
   cd ios
   pod deintegrate
   pod install
   cd ..
   ```

3. **Check AppDelegate.swift:**
   - Ensure `bundleURL()` function exists
   - Ensure `#if DEBUG` block is correct
   - Check Xcode console for the log messages above

---

## Summary

- **For Development:** Always use **Debug** build + **Metro running**
- **For Release/TestFlight:** Must have `main.jsbundle` bundled
- **Error "No script URL provided"** = `bundleURL()` returned `nil`
- **Check Xcode scheme** = Must be Debug for development
- **Metro must be running** = Start with `npm start`
