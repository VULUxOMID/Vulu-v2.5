import Expo
import React
import ReactAppDependencyProvider
import Foundation

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory? // Made accessible for SceneDelegate

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    // Create React Native delegate - this is where bundleURL() is defined
    // The bundleURL() method in ReactNativeDelegate is the SINGLE SOURCE OF TRUTH
    // for determining where to load JavaScript from (Metro in DEBUG, main.jsbundle in RELEASE)
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)
    
    // Log which configuration we're using
#if DEBUG
    print("📱 [AppDelegate] Starting in DEBUG mode - will use Metro bundler")
#else
    print("📱 [AppDelegate] Starting in RELEASE mode - will use embedded main.jsbundle")
#endif

#if os(iOS) || os(tvOS)
    // UIScene lifecycle support for iOS 13+
    // For iOS 13+, window creation and React Native initialization is handled by SceneDelegate
    // For iOS 12 and below, create window and start React Native here
    if #available(iOS 13.0, *) {
      // iOS 13+: Do NOT start React Native here - SceneDelegate will handle it
      // This prevents double initialization which causes assertion failures
      print("📱 [AppDelegate] iOS 13+ detected - SceneDelegate will handle React Native initialization")
    } else {
      // iOS 12 and below: Create window and start React Native here
      window = UIWindow(frame: UIScreen.main.bounds)
      factory.startReactNative(
        withModuleName: "main",
        in: window,
        launchOptions: launchOptions)
    }
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }

  // MARK: - UISceneSession Lifecycle (iOS 13+)
  // Required for UIScene lifecycle support - fixes iOS 27+ requirement
  @available(iOS 13.0, *)
  public func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
    let sceneConfig = UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
    sceneConfig.delegateClass = SceneDelegate.self
    return sceneConfig
  }

  @available(iOS 13.0, *)
  public func application(_ application: UIApplication, didDiscardSceneSessions sceneSessions: Set<UISceneSession>) {
    // Called when the user discards a scene session
    print("📱 [AppDelegate] Scene sessions discarded: \(sceneSessions.count)")
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins
  
  // MARK: - Bundle URL Resolution
  // This is the SINGLE SOURCE OF TRUTH for JS bundle URL in this app.
  // React Native calls this method to get the URL for loading JavaScript.
  
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // For expo-dev-client, bridge may already have a bundleURL set
    // Otherwise, fall back to our bundleURL() implementation
    return bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    // DEBUG MODE: Return Metro bundler URL from RCTBundleURLProvider
    // RCTBundleURLProvider automatically handles:
    // - localhost:8081 for iOS Simulator
    // - Auto-detection of Mac IP for physical devices on same Wi-Fi network
    // The jsBundleURL method should return a non-optional URL.
    // If it returns nil, that indicates a configuration problem that must be fixed.
    let settings = RCTBundleURLProvider.sharedSettings()
    
    // Use jsBundleURL which returns a non-optional URL
    // This method constructs the proper Metro URL based on the device type and network
    // Note: Using the method without fallbackExtension parameter (as in the backup/working version)
    let metroURL = settings.jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
    
    if let url = metroURL {
      print("✅ [ReactNativeDelegate] Metro bundler URL: \(url.absoluteString)")
      return url
    }
    
    // If RCTBundleURLProvider returns nil, this is a configuration error.
    // Common causes:
    // 1. Not running in DEBUG mode (check Xcode scheme)
    // 2. Metro bundler not started
    // 3. Network configuration issue
    // We return nil here so React Native shows a clear error message.
    // The user must fix the configuration - we cannot construct a valid URL ourselves.
    print("❌ [ReactNativeDelegate] CRITICAL: RCTBundleURLProvider returned nil!")
    print("   → This means Metro bundler is NOT running or not accessible")
    print("   → FIX 1: Start Metro bundler with: 'npx expo start --dev-client --host lan'")
    print("   → FIX 2: Wait for Metro to show: 'Metro waiting on exp://192.168.x.x:8081'")
    print("   → FIX 3: Keep Metro running, then run the app from Xcode")
    print("   → FIX 4: For physical devices, ensure device and Mac are on same Wi-Fi network")
    print("   → FIX 5: Verify Metro is accessible: Open http://192.168.x.x:8081/status in Safari")
    return nil
#else
    // RELEASE MODE: Load the pre-bundled JS file from the app bundle
    // This file is created by the "Bundle React Native code and images" build phase
    // during Release builds. If it doesn't exist, the build phase failed.
    if let bundledURL = Bundle.main.url(forResource: "main", withExtension: "jsbundle") {
      print("✅ [ReactNativeDelegate] Using bundled JS: \(bundledURL.absoluteString)")
      return bundledURL
    } else {
      // In Release mode, if main.jsbundle doesn't exist, the build phase failed
      // This should never happen if the build completed successfully
      print("❌ [ReactNativeDelegate] RELEASE BUILD ERROR: main.jsbundle not found in app bundle!")
      print("   → The 'Bundle React Native code and images' build phase may have failed")
      print("   → Check Xcode build logs for bundling errors")
      print("   → Ensure you're building with Release configuration for Archive/TestFlight")
      return nil
    }
#endif
  }
}
