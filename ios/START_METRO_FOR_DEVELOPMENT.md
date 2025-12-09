# Starting Metro Bundler for iOS Development

## ⚠️ IMPORTANT: Metro MUST be running before launching the app from Xcode

If Metro is not running, you will see:
- ❌ "No script URL provided (null)"
- ❌ "Could not connect to development server"
- ❌ "RCTBundleURLProvider returned nil"

---

## ✅ Correct Command for Expo Dev Client

**Your project uses Expo dev client** (indicated by `.expo/.virtual-metro-entry` in the bundle URL).

**Run this EXACT command from your project root:**

```bash
cd /Users/omid/Vulu-v2.5
npx expo start --dev-client --host lan
```

**⚠️ Do NOT use `npm start`** - that may not start the correct Metro configuration for Expo dev-client projects.

---

## ✅ What You Should See

After running the command, Metro should print:

```
✔ Metro bundler is ready
  exp://192.168.0.xxx:8081
```

**Keep this terminal window open** - Metro must stay running while you develop.

---

## ✅ Verify Metro is Accessible

### On Your Mac:
1. Open Safari
2. Go to: `http://192.168.0.xxx:8081/status` (use the IP from Metro output)
3. Should show: `{"status":"packager-status":"running"}`

### On Your iPhone (if using physical device):
1. Open Safari
2. Go to: `http://192.168.0.xxx:8081/status` (same IP)
3. Should show the same status

**If it doesn't load:**
- Device and Mac are not on the same Wi-Fi network
- Firewall is blocking port 8081
- VPN is active (disable it)
- IP address changed (restart Metro)

---

## ✅ Then Run the App

1. **Metro is running** (terminal shows "Metro waiting on exp://...")
2. **Open Xcode**
3. **Press Run** (▶️) or press ⌘R
4. **Check Xcode console** - should see:
   ```
   ✅ [ReactNativeDelegate] Metro bundler URL: http://192.168.0.xxx:8081/...
   ```

---

## 🔧 Troubleshooting

### If you still get "Could not connect to development server":

1. **Check Metro terminal** - is it still running?
2. **Check the IP address** - did it change? Restart Metro if needed
3. **Check Wi-Fi** - device and Mac on same network?
4. **Check firewall** - allow port 8081
5. **Try simulator instead** - `localhost:8081` always works on simulator

### If Metro won't start:

```bash
# Clear Metro cache
npx expo start --dev-client --host lan --clear

# Or reset everything
rm -rf node_modules .expo
npm install
npx expo start --dev-client --host lan
```

---

## 📝 Quick Reference

**Development workflow:**
1. Start Metro: `npx expo start --dev-client --host lan`
2. Wait for "Metro waiting on exp://..."
3. Run app from Xcode
4. Keep Metro running while developing

**For Release/TestFlight builds:**
- Metro is NOT needed
- App uses embedded `main.jsbundle`
- Build with Release configuration
