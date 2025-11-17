# 🚀 Quick Start - Agora Setup Complete!

## ✅ What's Been Done

1. **✅ .env file created** with your Agora credentials
2. **✅ Firebase Functions configured** with Agora credentials
3. **✅ Native module support** added to app.json
4. **✅ Build configuration** updated for Agora SDK

## 🎯 Next Steps - Build Your App

### Option 1: Local Development Build (Recommended for Testing)

#### For iOS:
```bash
# Generate native iOS code
npx expo prebuild --platform ios --clean

# Install iOS dependencies
cd ios && pod install && cd ..

# Run on iOS simulator/device
npx expo run:ios
```

#### For Android:
```bash
# Generate native Android code
npx expo prebuild --platform android --clean

# Run on Android emulator/device
npx expo run:android
```

### Option 2: EAS Build (Recommended for Production)

```bash
# Build for iOS
eas build --profile development --platform ios

# OR build for Android
eas build --profile development --platform android

# Then install the build and run:
npx expo start --dev-client
```

## 🔍 Verify It's Working

After building and running:

1. **Check console logs** - You should see:
   ```
   ✅ Real Agora SDK imported and verified successfully
   🔧 Agora Import Wrapper: Using Real SDK
   ```

2. **Test live streaming**:
   - Start a stream as host on one device
   - Join as viewer on another device
   - Audio should work between devices!

## ⚠️ Important Notes

- **You CANNOT use Expo Go** - The real Agora SDK requires native modules
- **First build takes 10-15 minutes** - Subsequent builds are faster
- **Restart Metro bundler** after any .env changes

## 🆘 Troubleshooting

If you see "Using Mock" instead of "Using Real SDK":
1. Make sure you ran `npx expo prebuild`
2. Verify you're using a development build (not Expo Go)
3. Restart Metro bundler: `npx expo start --clear`

## 📚 Full Documentation

See `AGORA_SETUP_GUIDE.md` for detailed instructions and troubleshooting.

