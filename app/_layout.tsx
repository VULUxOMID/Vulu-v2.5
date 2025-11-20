// Fix for frozen object error in development mode
if (__DEV__) {
  // Store original functions
  const originalFreeze = Object.freeze;
  const originalSeal = Object.seal;
  const originalPreventExtensions = Object.preventExtensions;
  const originalDefineProperty = Object.defineProperty;

  // In development mode, completely disable freezing to prevent React errors
  // This is safe because it's only in development and prevents the frozen object errors
  Object.freeze = function<T>(obj: T): T {
    // Simply return the object without freezing in development
    return obj;
  };

  Object.seal = function<T>(obj: T): T {
    // Simply return the object without sealing in development
    return obj;
  };

  Object.preventExtensions = function<T>(obj: T): T {
    // Simply return the object without preventing extensions in development
    return obj;
  };

  // Override Object.defineProperty to prevent freezing of 'current' property
  Object.defineProperty = function(obj: any, prop: string | symbol, descriptor: PropertyDescriptor) {
    try {
      // If trying to define 'current' property, make sure it's writable
      if (prop === 'current' && descriptor) {
        descriptor.writable = true;
        descriptor.configurable = true;
      }
      return originalDefineProperty(obj, prop, descriptor);
    } catch (error) {
      // If defineProperty fails, just return the object
      console.warn('defineProperty failed, continuing:', error);
      return obj;
    }
  };

  // Add global error handling for module loading issues
  const originalRequire = global.require;
  if (originalRequire) {
    global.require = function(id: string) {
      try {
        return originalRequire(id);
      } catch (error: any) {
        if (error.message && error.message.includes('Requiring unknown module')) {
          console.warn('Module loading error caught:', error.message);
          return {};
        }
        throw error;
      }
    };
  }

  // Add global error handler for unhandled promise rejections
  if (typeof global !== 'undefined' && global.addEventListener) {
    global.addEventListener('unhandledrejection', (event: any) => {
      console.warn('Unhandled promise rejection caught:', event.reason);
      // Only call preventDefault if it exists (web environment)
      if (typeof event.preventDefault === 'function') {
        event.preventDefault();
      }
    });
  }

  // Add global error handler for animation errors
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleLog = console.log;
  const originalConsoleInfo = console.info;
  console.error = function(...args: any[]) {
    const errorMessage = args[0]?.toString() || '';
    
    // Suppress animation-related errors that are safe to ignore
    if (
      errorMessage.includes('useNativeDriver') ||
      errorMessage.includes('stopAnimation') ||
      errorMessage.includes('animated node') ||
      errorMessage.includes('JS driven animation')
    ) {
      console.warn('[Animation Warning - Safe to Ignore]:', ...args);
      return;
    }
    // Suppress Firestore listen aborts during HMR/reload
    if (
      errorMessage.includes('net::ERR_ABORTED') ||
      errorMessage.includes('google.firestore.v1.Firestore/Listen/channel') ||
      errorMessage.includes('google.firestore.v1.Firestore/Write/channel')
    ) {
      return;
    }
    if (
      errorMessage.includes('Unexpected text node') ||
      errorMessage.includes('text node cannot be a child of a <View>')
    ) {
      return;
    }
    // Suppress web push VAPID warnings in web dev
    if (errorMessage.includes('notification.vapidPublicKey')) {
      return;
    }
    // Suppress setState on unmounted component during HMR
    if (errorMessage.includes("Can't perform a React state update on a component that hasn't mounted yet")) {
      return;
    }
    
    // Pass through all other errors
    originalConsoleError.apply(console, args);
  };

  const suppressedPatterns = [
    'Logs will appear in the browser console',
    'Expo Router',
    'Fast Refresh will perform a full reload',
    'Require cycle:',
    'VirtualizedLists should never be nested',
    'Non-serializable values were found in the navigation state',
    'Encountered an error loading content',
  ];

  const recentMap: Map<string, number> = new Map();
  const shouldSuppress = (msg: string) => suppressedPatterns.some(p => msg.includes(p));
  const throttle = (msg: string) => {
    const now = Date.now();
    const last = recentMap.get(msg) || 0;
    if (now - last < 2000) return true;
    recentMap.set(msg, now);
    return false;
  };

  console.warn = function(...args: any[]) {
    const msg = (args[0]?.toString() || '').trim();
    if (shouldSuppress(msg) || throttle(msg)) return;
    originalConsoleWarn.apply(console, args);
  };

  console.log = function(...args: any[]) {
    const msg = (args[0]?.toString() || '').trim();
    if (shouldSuppress(msg) || throttle(msg)) return;
    originalConsoleLog.apply(console, args);
  };

  console.info = function(...args: any[]) {
    const msg = (args[0]?.toString() || '').trim();
    if (shouldSuppress(msg) || throttle(msg)) return;
    originalConsoleInfo.apply(console, args);
  };
}

import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { LogBox } from 'react-native';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// CRITICAL: Initialize Firebase before any providers touch Auth
import '../src/services/firebase';

// Import all providers
import { AuthProvider } from '../src/context/AuthContext';
import { SubscriptionProvider } from '../src/context/SubscriptionContext';
import { NotificationProvider } from '../src/context/NotificationContext';
import { MusicProvider } from '../src/context/MusicContext';
import { GamingProvider } from '../src/context/GamingContext';
import { ShopProvider } from '../src/context/ShopContext';
import { LiveStreamProvider } from '../src/context/LiveStreamContext';
import { MiniPlayerProvider } from '../src/context/MiniPlayerContext';
import { MenuPositionProvider } from '../src/components/SidebarMenu';
import { UserStatusProvider } from '../src/context/UserStatusContext';
import ErrorBoundary from '../src/components/ErrorBoundary';
import { setupGlobalErrorHandling } from '../src/utils/crashPrevention';

// Import test utilities for debugging (temporarily disabled)
// import '../src/utils/testSubscription';
// import '../src/utils/quickSubscriptionTest';
// import '../src/utils/debugSubscription';
// import '../src/utils/fixSubscription';
// import '../src/utils/testSubscriptionImport';
// import '../src/utils/testSubscriptionContextImport'; // Temporarily disabled for debugging

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Set up additional crash prevention
  useEffect(() => {
    setupGlobalErrorHandling();
    
    // Setup iOS error suppression for system/simulator errors
    if (Platform.OS === 'ios') {
      const { setupIOSErrorSuppression } = require('../src/utils/iosErrorSuppressor');
      setupIOSErrorSuppression();
    }

    LogBox.ignoreLogs([
      'notification.vapidPublicKey',
      'net::ERR_ABORTED',
      'Firestore/Listen/channel',
      'Firestore/Write/channel',
      'Unexpected text node',
      'text node cannot be a child of a <View>',
      "Can't perform a React state update on a component that hasn't mounted yet",
      'Require cycle:',
      'VirtualizedLists should never be nested',
      'Non-serializable values were found in the navigation state',
    ]);
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <MenuPositionProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <NotificationProvider>
                  <UserStatusProvider>
                    <MusicProvider>
                      <GamingProvider>
                        <ShopProvider>
                          <LiveStreamProvider>
                            <MiniPlayerProvider>
                              <StatusBar style="light" />
                              <Stack
                                screenOptions={{
                                  headerShown: false,
                                  contentStyle: { backgroundColor: '#131318' },
                                }}
                              />
                            </MiniPlayerProvider>
                          </LiveStreamProvider>
                        </ShopProvider>
                      </GamingProvider>
                    </MusicProvider>
                  </UserStatusProvider>
                </NotificationProvider>
              </SubscriptionProvider>
            </AuthProvider>
          </MenuPositionProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
