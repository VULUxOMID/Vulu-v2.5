# dSYM Warning Fix Guide

## Warning Message
```
warning: (arm64) /Users/omid/Library/Developer/Xcode/DerivedData/VULU-bwcmaytocmxdhhcpnrwqkuuufupv/Build/Products/Debug-iphoneos/VULU.app/VULU empty dSYM file detected, dSYM was created with an executable with no debug info.
```

## What is dSYM?
dSYM (Debug Symbol) files contain debug information that helps Xcode map crash reports back to your source code. They're essential for debugging crashes in production.

## Why This Warning Appears
This warning appears when:
1. **Debug Information Format** is not set to "DWARF with dSYM File" for Debug builds
2. **Strip Debug Symbols During Copy** is set to "Yes" for Debug builds
3. The build configuration is optimized for size rather than debugging

## How to Fix

### Option 1: Fix in Xcode (Recommended)

1. **Open your project in Xcode:**
   ```bash
   open ios/VULU.xcworkspace
   # or
   open ios/VULU.xcodeproj
   ```

2. **Select your project** in the navigator (top-level "VULU")

3. **Select your target** (VULU)

4. **Go to Build Settings** tab

5. **Search for "Debug Information Format"**

6. **Set Debug Information Format:**
   - For **Debug** configuration: Set to `DWARF with dSYM File`
   - For **Release** configuration: Keep as `DWARF with dSYM File` (should already be set)

7. **Search for "Strip Debug Symbols During Copy"**

8. **Set Strip Debug Symbols:**
   - For **Debug** configuration: Set to `No`
   - For **Release** configuration: Can remain `Yes` (for smaller app size)

9. **Clean and rebuild:**
   ```bash
   # In Xcode: Product → Clean Build Folder (Shift+Cmd+K)
   # Then rebuild
   ```

### Option 2: Fix via xcconfig File

If you're using `.xcconfig` files, add these settings:

**ios/Pods/Target Support Files/Pods-VULU/Pods-VULU.debug.xcconfig:**
```
DEBUG_INFORMATION_FORMAT = dwarf-with-dsym
STRIP_INSTALLED_PRODUCT = NO
```

**ios/Pods/Target Support Files/Pods-VULU/Pods-VULU.release.xcconfig:**
```
DEBUG_INFORMATION_FORMAT = dwarf-with-dsym
STRIP_INSTALLED_PRODUCT = YES
```

### Option 3: Fix via build.gradle (if using React Native CLI)

**ios/build.gradle** (if exists):
```gradle
buildTypes {
    debug {
        debuggable true
        // Ensure debug symbols are generated
    }
    release {
        // Release settings
    }
}
```

## Verification

After making changes, rebuild and check:

1. **Build the app:**
   ```bash
   npx expo run:ios
   # or
   cd ios && xcodebuild -workspace VULU.xcworkspace -scheme VULU -configuration Debug
   ```

2. **Check for the warning** - it should no longer appear

3. **Verify dSYM files are generated:**
   ```bash
   find ~/Library/Developer/Xcode/DerivedData -name "*.dSYM" -type d | grep VULU
   ```

## Impact

- **Without dSYM files:** Crash reports will show memory addresses instead of function names
- **With dSYM files:** Crash reports will show readable stack traces with file names and line numbers

## Note

This is a **build configuration issue**, not a code issue. The warning doesn't affect app functionality, but fixing it will improve crash debugging capabilities.

## Related Files

- `ios/VULU.xcodeproj/project.pbxproj` - Xcode project settings
- `ios/Pods/` - CocoaPods configuration
- `eas.json` - EAS Build configuration (if using Expo Application Services)

