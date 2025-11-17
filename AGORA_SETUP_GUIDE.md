# Agora Live Streaming Setup Guide

This guide will help you set up the real Agora SDK for live streaming in your Vulu app.

## Prerequisites

1. **Agora Account**: Sign up at [https://console.agora.io/](https://console.agora.io/)
2. **Agora Project**: Create a new project in the Agora Console
3. **Development Environment**: 
   - Node.js installed
   - Expo CLI installed
   - Xcode (for iOS) or Android Studio (for Android)

## Step 1: Get Your Agora Credentials

1. Go to [Agora Console](https://console.agora.io/)
2. Navigate to **Project Management** > **Your Project**
3. Copy your **App ID** and **App Certificate** (click "Show" to reveal the certificate)
4. (Optional) For REST API access, go to **Account** > **RESTful API** and get your **Customer ID** and **Customer Secret**

## Step 2: Configure Environment Variables

Create a `.env` file in the root of your project with the following:

```bash
# Agora App ID (required)
EXPO_PUBLIC_AGORA_APP_ID=your-agora-app-id-here

# Agora App Certificate (required for token generation)
EXPO_PUBLIC_AGORA_APP_CERTIFICATE=your-agora-app-certificate-here

# Agora Customer ID (optional, for REST API)
EXPO_PUBLIC_AGORA_CUSTOMER_ID=your-agora-customer-id-here

# Agora Customer Secret (optional, for REST API)
EXPO_PUBLIC_AGORA_CUSTOMER_SECRET=your-agora-customer-secret-here

# Video Streaming (optional, default: false)
EXPO_PUBLIC_ENABLE_VIDEO_STREAMING=false

# Default Stream Profile (optional, default: AUDIO_ONLY)
EXPO_PUBLIC_DEFAULT_STREAM_PROFILE=AUDIO_ONLY

# Max Participants Per Stream (optional, default: 50)
EXPO_PUBLIC_MAX_PARTICIPANTS_PER_STREAM=50
```

**Important**: Replace the placeholder values with your actual Agora credentials.

## Step 3: Install Dependencies

The required packages are already installed:
- `react-native-agora` (v4.5.3)
- `expo-build-properties` (for native module support)

If you need to reinstall:

```bash
npm install
```

## Step 4: Build Native Code

Since `react-native-agora` is a native module, you **cannot** use Expo Go. You need to create a development build.

### Option A: Local Development Build (Recommended for Testing)

#### For iOS:

```bash
# Generate native iOS project
npx expo prebuild --platform ios

# Install iOS pods
cd ios && pod install && cd ..

# Run on iOS simulator or device
npx expo run:ios
```

#### For Android:

```bash
# Generate native Android project
npx expo prebuild --platform android

# Run on Android emulator or device
npx expo run:android
```

### Option B: EAS Build (Recommended for Production)

1. Install EAS CLI (if not already installed):
   ```bash
   npm install -g eas-cli
   ```

2. Login to EAS:
   ```bash
   eas login
   ```

3. Configure your project:
   ```bash
   eas build:configure
   ```

4. Create a development build:
   ```bash
   # For iOS
   eas build --profile development --platform ios

   # For Android
   eas build --profile development --platform android
   ```

5. Install the build on your device and run:
   ```bash
   npx expo start --dev-client
   ```

## Step 5: Verify Setup

1. Start your development server:
   ```bash
   npx expo start --dev-client
   ```

2. Open your app on a device or simulator

3. Check the console logs - you should see:
   ```
   ✅ Real Agora SDK imported and verified successfully
   🔧 Agora Import Wrapper: Using Real SDK
   ```

   If you see "Using Mock" instead, the native module isn't linked properly. Make sure you:
   - Built the native code (Step 4)
   - Are using a development build (not Expo Go)
   - Restarted the Metro bundler after building

## Step 6: Test Live Streaming

1. **Start a stream as host**:
   - Go to the live streaming section
   - Click "Go Live"
   - Grant microphone permissions when prompted
   - You should see "Live Now" status

2. **Join as viewer**:
   - On another device or account
   - Join the live stream
   - You should be able to hear the host's audio

## Troubleshooting

### "Using Mock" instead of "Using Real SDK"

**Cause**: Native module not linked or running in Expo Go.

**Solution**:
- Make sure you've run `npx expo prebuild` or created an EAS build
- Verify you're using a development build, not Expo Go
- For iOS: Run `cd ios && pod install && cd ..`
- Restart Metro bundler: `npx expo start --clear`

### "Cannot find module 'react-native-agora'"

**Cause**: Package not installed or native code not built.

**Solution**:
```bash
npm install react-native-agora
npx expo prebuild --clean
```

### Audio not working

**Cause**: Permissions not granted or SDK not properly initialized.

**Solution**:
- Check that microphone permissions are granted in device settings
- Verify Agora credentials are correct in `.env`
- Check console logs for Agora initialization errors
- Ensure you're using a development build (not Expo Go)

### Build errors on iOS

**Cause**: CocoaPods dependencies or Xcode configuration issues.

**Solution**:
```bash
cd ios
pod deintegrate
pod install
cd ..
npx expo run:ios
```

### Build errors on Android

**Cause**: Gradle sync issues or missing dependencies.

**Solution**:
```bash
cd android
./gradlew clean
cd ..
npx expo prebuild --clean --platform android
npx expo run:android
```

## Important Notes

1. **Expo Go Limitation**: The real Agora SDK **cannot** run in Expo Go because it requires native modules. You must use a development build.

2. **Environment Variables**: Make sure your `.env` file is in the root directory and contains `EXPO_PUBLIC_` prefix for variables that need to be accessible in the app.

3. **Token Generation**: The app uses Firebase Cloud Functions to generate Agora tokens. Make sure your Firebase Functions are deployed and configured with Agora credentials.

4. **Production Builds**: For production, use EAS Build to create optimized builds with the native Agora SDK included.

## Next Steps

- Test audio streaming between multiple devices
- Configure video streaming if needed (set `EXPO_PUBLIC_ENABLE_VIDEO_STREAMING=true`)
- Set up Firebase Cloud Functions for token generation (if not already done)
- Deploy to TestFlight (iOS) or Google Play Internal Testing (Android)

## Support

If you encounter issues:
1. Check the [Agora Documentation](https://docs.agora.io/)
2. Review console logs for error messages
3. Verify all credentials are correct
4. Ensure you're using a development build (not Expo Go)

