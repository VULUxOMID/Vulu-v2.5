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
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

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

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    // Dev mode: load the JS bundle from the Metro bundler
    // RCTBundleURLProvider automatically handles:
    // - localhost for iOS Simulator
    // - Auto-detection of Mac IP for physical devices on same network
    let settings = RCTBundleURLProvider.sharedSettings()
    if let url = settings.jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry", fallbackExtension: nil) {
      print("✅ [AppDelegate] Metro bundler URL: \(url.absoluteString)")
      return url
    }
    
    // If RCTBundleURLProvider returns nil, something is wrong:
    // - Not running in DEBUG mode (check Xcode scheme)
    // - Metro bundler not started
    // - Network configuration issue
    // Returning nil here is safer than providing a non-functional URL
    print("❌ [AppDelegate] CRITICAL: RCTBundleURLProvider returned nil.")
    print("   → Check that you're running in DEBUG mode (Product → Scheme → Edit Scheme → Run → Build Configuration = Debug)")
    print("   → Ensure Metro bundler is running: 'npm start' or 'expo start --dev-client'")
    print("   → For physical devices: ensure device and Mac are on the same Wi-Fi network")
    return nil
#else
    // Production: load the pre-bundled JS file
    // If main.jsbundle doesn't exist, this will return nil and cause the error
    if let url = Bundle.main.url(forResource: "main", withExtension: "jsbundle") {
      print("✅ [AppDelegate] Using bundled JS: \(url.absoluteString)")
      return url
    } else {
      print("❌ [AppDelegate] RELEASE BUILD ERROR: main.jsbundle not found. You must bundle JS for Release builds.")
      return nil
    }
#endif
  }
}
