import UIKit
import ExpoModulesCore

@available(iOS 13.0, *)
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = (scene as? UIWindowScene) else { return }
    
    // Get the AppDelegate to access the React Native factory
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate,
          let factory = appDelegate.reactNativeFactory else {
      print("⚠️ [SceneDelegate] Could not access AppDelegate or React Native factory")
      return
    }
    
    // Create window with the scene
    window = UIWindow(windowScene: windowScene)
    window?.makeKeyAndVisible()
    
    // Start React Native with the scene's window
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: nil)
    
    print("✅ [SceneDelegate] Scene connected and React Native started")
  }

  func sceneDidDisconnect(_ scene: UIScene) {
    // Called when the scene is being released by the system
    print("📱 [SceneDelegate] Scene disconnected")
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    // Called when the scene has moved from an inactive state to an active state
    print("📱 [SceneDelegate] Scene became active")
  }

  func sceneWillResignActive(_ scene: UIScene) {
    // Called when the scene will move from an active state to an inactive state
    print("📱 [SceneDelegate] Scene will resign active")
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    // Called as the scene transitions from the background to the foreground
    print("📱 [SceneDelegate] Scene will enter foreground")
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    // Called as the scene transitions from the foreground to the background
    print("📱 [SceneDelegate] Scene did enter background")
  }
}

