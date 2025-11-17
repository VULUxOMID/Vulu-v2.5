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
    // For iOS 13+, window creation is handled by SceneDelegate
    // For iOS 12 and below, create window here
    if #available(iOS 13.0, *) {
      // Window will be created by SceneDelegate when scene connects
      // Only start React Native here if no scene delegate is available (fallback)
      if UIApplication.shared.connectedScenes.isEmpty {
        // Fallback: create window if no scene is available
        window = UIWindow(frame: UIScreen.main.bounds)
        factory.startReactNative(
          withModuleName: "main",
          in: window,
          launchOptions: launchOptions)
      }
    } else {
      // Fallback for iOS 12 and below
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
    // First, try the default bundle URL provider (works for simulator and same network)
    let settings = RCTBundleURLProvider.sharedSettings()
    if let bundleURL = settings.jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry") {
        print("✅ Found Metro bundler at: \(bundleURL.absoluteString)")
        return bundleURL
    }
    
    // Fallback: Try with explicit Mac IP address for physical devices
    // Update this IP if your Mac's IP address changes
    let macIPAddress = "10.113.240.147"
    let urlString = "http://\(macIPAddress):8081/.expo/.virtual-metro-entry.bundle?platform=ios&dev=true"
    if let fallbackURL = URL(string: urlString) {
        print("⚠️ Using fallback Metro URL: \(urlString)")
        return fallbackURL
    }
    
    print("❌ Could not find Metro bundler. Make sure 'npx expo start --host \(macIPAddress)' is running.")
    return nil
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
