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
    // Use React Native's built-in bundle URL provider
    // This automatically handles:
    // - localhost for iOS Simulator
    // - Auto-detection of Mac IP for physical devices on same network
    // - Proper Metro bundler URL construction
    let settings = RCTBundleURLProvider.sharedSettings()
    let bundleURL = settings.jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
    
    if let url = bundleURL {
      print("✅ [AppDelegate] Metro bundler URL: \(url.absoluteString)")
      return url
    } else {
      print("⚠️ [AppDelegate] Could not determine Metro bundler URL. Make sure 'expo start' is running.")
      return nil
    }
#else
    // Production: Use bundled JavaScript
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
