import { initializeApp, FirebaseApp } from 'firebase/app';
import { Auth, initializeAuth, getReactNativePersistence, browserLocalPersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore, Firestore, connectFirestoreEmulator, setLogLevel } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Firebase configuration for VULU
const firebaseConfig = {
  apiKey: "AIzaSyBHL5BpkQRDe-03hE5-7TYcbr2aad1ezqg",
  authDomain: "vulugo.firebaseapp.com",
  projectId: "vulugo",
  // Correct storage bucket host for Firebase Storage
  storageBucket: "vulugo.appspot.com",
  messagingSenderId: "876918371895",
  appId: "1:876918371895:web:49d57bd00939d49889b1b2",
  measurementId: "G-LLTSS9NFCD"
};

// Firebase service instances
let app!: FirebaseApp;
let auth!: Auth;
let db!: Firestore;
let storage!: FirebaseStorage;
let functions!: Functions;

// Initialization status
let initializationAttempted = false;
let initializationError: Error | null = null;

/**
 * Initialize Firebase services with comprehensive error handling
 */
const initializeFirebase = (): { success: boolean; error?: Error } => {
  if (initializationAttempted) {
    return { success: !!app, error: initializationError };
  }

  initializationAttempted = true;

  try {
    console.log('🔥 Initializing Firebase services...');

    // Initialize Firebase app
    app = initializeApp(firebaseConfig);
    console.log('✅ Firebase app initialized');

    // Initialize Auth with platform-specific persistence (no top-level await)
    try {
      // initializeAuth is synchronous; do NOT await it
      const persistence = Platform.OS === 'web' 
        ? browserLocalPersistence 
        : getReactNativePersistence(AsyncStorage);
      
      auth = initializeAuth(app, {
        persistence: persistence
      });
      console.log(`✅ Firebase Auth initialized with ${Platform.OS === 'web' ? 'browser' : 'AsyncStorage'} persistence`);

      // Optional check without await (currentUser is available if restored)
      const currentUser = auth.currentUser;
      if (currentUser) {
        console.log('✅ Auth state restored from persistence:', {
          uid: currentUser.uid,
          email: currentUser.email
        });
      } else {
        console.log('ℹ️ No persisted auth state found (user not signed in)');
      }

      // Test AsyncStorage availability asynchronously (non-blocking) - only on native platforms
      if (Platform.OS !== 'web') {
        AsyncStorage.setItem('__firebase_auth_test__', 'test')
          .then(() => AsyncStorage.getItem('__firebase_auth_test__'))
          .then(value => {
            if (value === 'test') {
              console.log('✅ AsyncStorage persistence verified');
              AsyncStorage.removeItem('__firebase_auth_test__');
            } else {
              console.warn('⚠️ AsyncStorage test failed - persistence may not work correctly');
            }
          })
          .catch(err => {
            console.warn('⚠️ AsyncStorage test error:', err);
          });
      }

    } catch (authError: any) {
      console.error('❌ CRITICAL: Firebase Auth initialization failed:', authError);
      console.error('❌ Error details:', {
        message: authError.message,
        code: authError.code,
        stack: authError.stack
      });

      // DO NOT FALL BACK - crash to prevent session-only auth
      throw new Error(`Auth persistence required but failed: ${authError.message}`);
    }

    db = initializeFirestore(app, {
      useFetchStreams: true,
      experimentalAutoDetectLongPolling: true,
    });
    console.log('✅ Firestore initialized');

    try {
      setLogLevel('silent');
    } catch {}

    // Initialize Storage
    storage = getStorage(app);
    console.log('✅ Firebase Storage initialized');

    // Initialize Functions
    functions = getFunctions(app);
    console.log('✅ Firebase Functions initialized');

    // Development environment setup
    if (__DEV__) {
      console.log('🔧 Development mode: Firebase services ready');
      // Note: Emulator connection would go here if needed
      // connectFirestoreEmulator(db, 'localhost', 8080);
    }

    console.log('🎉 All Firebase services initialized successfully');
    return { success: true };

  } catch (error: any) {
    console.error('❌ Firebase initialization failed:', error);
    initializationError = error;

    // Keep service variables uninitialized; accessors will guard usage

    return { success: false, error };
  }
};

/**
 * Get Firebase services with initialization check
 */
export const getFirebaseServices = () => {
  const result = initializeFirebase();

  if (!result.success) {
    console.warn('⚠️ Firebase services not available:', result.error?.message);
  }

  return {
    app,
    auth,
    db,
    storage,
    functions,
    isInitialized: result.success,
    initializationError: result.error
  };
};

/**
 * Check if Firebase is properly initialized
 */
export const isFirebaseInitialized = (): boolean => {
  return !!app && !!auth && !!db && !!storage && !!functions;
};

/**
 * Get initialization status and error details
 */
export const getFirebaseStatus = () => {
  return {
    attempted: initializationAttempted,
    initialized: isFirebaseInitialized(),
    error: initializationError,
    services: {
      app: !!app,
      auth: !!auth,
      db: !!db,
      storage: !!storage,
      functions: !!functions
    }
  };
};

/**
 * Diagnostic function to check auth persistence status
 * Call this after sign-in to verify persistence is working
 */
export const checkAuthPersistence = async (): Promise<{
  isConfigured: boolean;
  asyncStorageWorks: boolean;
  currentUser: any;
  error?: string;
}> => {
  try {
    // Check if auth is initialized
    if (!auth) {
      return {
        isConfigured: false,
        asyncStorageWorks: false,
        currentUser: null,
        error: 'Auth not initialized'
      };
    }

    // Test AsyncStorage
    let asyncStorageWorks = false;
    try {
      const testKey = '__persistence_check__';
      await AsyncStorage.setItem(testKey, 'test');
      const value = await AsyncStorage.getItem(testKey);
      await AsyncStorage.removeItem(testKey);
      asyncStorageWorks = value === 'test';
    } catch (error: any) {
      console.error('AsyncStorage test failed:', error);
    }

    // Check current user
    const currentUser = auth.currentUser;

    // Try to read Firebase Auth's persistence data
    let persistedAuthData = null;
    try {
      const keys = await AsyncStorage.getAllKeys();
      const firebaseKeys = keys.filter(key => key.includes('firebase'));
      console.log('🔍 Firebase-related AsyncStorage keys:', firebaseKeys);

      // Try to read the auth state key
      for (const key of firebaseKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value && value.includes('uid')) {
          persistedAuthData = key;
          console.log('✅ Found persisted auth data in key:', key);
          break;
        }
      }
    } catch (error) {
      console.warn('Could not check persisted auth data:', error);
    }

    return {
      isConfigured: true,
      asyncStorageWorks,
      currentUser: currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        persistedDataFound: !!persistedAuthData
      } : null,
    };
  } catch (error: any) {
    return {
      isConfigured: false,
      asyncStorageWorks: false,
      currentUser: null,
      error: error.message
    };
  }
};

// Initialize Firebase immediately
const initResult = initializeFirebase();

// Initialize Firebase utilities after successful initialization
if (initResult.success) {
  // Dynamically import to avoid circular dependencies
  setTimeout(() => {
    import('../utils/firebaseOperationWrapper').then(({ default: FirebaseOperationWrapper }) => {
      try {
        FirebaseOperationWrapper.initialize();
        console.log('✅ Firebase utilities initialized successfully');
      } catch (error) {
        console.warn('⚠️ Failed to initialize Firebase utilities:', error);
      }
    }).catch(error => {
      console.warn('⚠️ Failed to import Firebase utilities:', error);
    });
  }, 100); // Small delay to ensure Firebase is fully initialized
}

// Export services (may be null if initialization failed)
export { auth, db, storage, functions };
export default app;