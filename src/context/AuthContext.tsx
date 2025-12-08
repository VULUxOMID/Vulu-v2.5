import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService, GuestUser } from '../services/authService';
import { firestoreService } from '../services/firestoreService';
import { sessionService } from '../services/sessionService';
import { safePropertySet, SafeTimer, safeAsync } from '../utils/crashPrevention';
// Import socialAuthService dynamically to avoid Google Sign-In errors in Expo Go
let socialAuthService: any = null;
try {
  socialAuthService = require('../services/socialAuthService').socialAuthService;
} catch (error) {
  console.warn('Social auth service not available');
}
import { securityService } from '../services/securityService';
import { profileSyncService } from '../services/profileSyncService';
import { encryptionService } from '../services/encryptionService';
import { PresenceService } from '../services/presenceService';
import { secureCredentialService } from '../services/secureCredentialService';
import { savedProfilesService } from '../services/savedProfilesService';

interface AuthContextType {
  user: User | GuestUser | null;
  userProfile: any | null;
  loading: boolean;
  authReady: boolean; // ADDED: True when auth state is determined and auto-login is complete
  hasLocalSession: boolean; // ADDED: True if local session token exists and user is restored
  sessionVerified: boolean; // ADDED: True after Firebase verifies the session token
  isGuest: boolean;
  isAdmin: boolean; // ADDED: True if user has admin privileges
  adminLevel: string | null; // ADDED: Admin level (super, moderator, support)
  justRegistered: boolean; // ADDED: Track if user just completed registration
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, username: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  clearAuthCache: () => Promise<void>; // ADDED: For debugging automatic sign-in issues
  updateUserProfile: (updates: any) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  isEmailVerified: () => boolean;
  updateUserEmail: (newEmail: string, currentPassword: string) => Promise<void>;
  deleteAccount: (currentPassword: string) => Promise<void>;
  markRegistrationComplete: () => void; // ADDED: Mark registration as complete
  clearRegistrationFlag: () => void; // ADDED: Clear registration flag
  updateActivity: () => void;
  getSessionData: () => any;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  getSocialAuthMethods: () => { google: boolean; apple: boolean };
  refreshAdminStatus: () => Promise<void>; // ADDED: Refresh admin status
  // Onboarding methods
  completeOnboarding: (onboardingData: any) => Promise<void>;
  isOnboardingComplete: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Safe version of useAuth that returns null instead of throwing
// Use this in components that might render before AuthProvider is ready
export const useAuthSafe = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    console.warn('⚠️ useAuthSafe: AuthProvider not available yet');
    return null;
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

// CRITICAL FIX: Helper functions for iOS Simulator AsyncStorage errors
const isSimulatorStorageError = (error: any): boolean => {
  if (!error || typeof error !== 'object') return false;

  const errorMessage = error.message || '';
  const errorString = error.toString() || '';

  // Check for iOS Simulator specific storage errors
  return (
    errorMessage.includes('Failed to create storage directory') ||
    errorMessage.includes('Failed to delete storage directory') ||
    errorMessage.includes('NSCocoaErrorDomain') ||
    errorMessage.includes('NSPOSIXErrorDomain') ||
    errorMessage.includes('ExponentExperienceData') ||
    errorMessage.includes('@anonymous') ||
    errorMessage.includes('RCTAsyncLocalStorage') ||
    errorMessage.includes('Not a directory') ||
    errorMessage.includes('No such file or directory') ||
    errorString.includes('storage directory')
  );
};

// Safe AsyncStorage wrapper that handles corruption
const safeAsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    if ((global as any).__STORAGE_BYPASS_MODE__) {
      console.warn(`🚧 Storage bypass: getItem(${key}) returning null`);
      return null;
    }

    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      if (isSimulatorStorageError(error)) {
        console.warn(`🚧 Storage error on getItem(${key}), enabling bypass mode`);
        (global as any).__STORAGE_BYPASS_MODE__ = true;
        return null;
      }
      throw error;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    if ((global as any).__STORAGE_BYPASS_MODE__) {
      console.warn(`🚧 Storage bypass: setItem(${key}) ignored`);
      return;
    }

    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      if (isSimulatorStorageError(error)) {
        console.warn(`🚧 Storage error on setItem(${key}), enabling bypass mode`);
        (global as any).__STORAGE_BYPASS_MODE__ = true;
        return;
      }
      throw error;
    }
  },

  async removeItem(key: string): Promise<void> {
    if ((global as any).__STORAGE_BYPASS_MODE__) {
      console.warn(`🚧 Storage bypass: removeItem(${key}) ignored`);
      return;
    }

    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      if (isSimulatorStorageError(error)) {
        console.warn(`🚧 Storage error on removeItem(${key}), enabling bypass mode`);
        (global as any).__STORAGE_BYPASS_MODE__ = true;
        return;
      }
      throw error;
    }
  },

  async multiRemove(keys: string[]): Promise<void> {
    if ((global as any).__STORAGE_BYPASS_MODE__) {
      console.warn(`🚧 Storage bypass: multiRemove ignored`);
      return;
    }

    try {
      await AsyncStorage.multiRemove(keys);
    } catch (error) {
      if (isSimulatorStorageError(error)) {
        console.warn(`🚧 Storage error on multiRemove, enabling bypass mode`);
        (global as any).__STORAGE_BYPASS_MODE__ = true;
        return;
      }
      throw error;
    }
  }
};

// Enhanced storage corruption recovery with multiple fallback strategies
// CRITICAL: Preserves Firebase auth keys to prevent sign-out
const handleSimulatorStorageError = async (): Promise<void> => {
  console.log('🔧 Starting enhanced iOS Simulator storage recovery...');

  // Strategy 1: Try selective clear (preserve Firebase auth)
  try {
    console.log('📋 Strategy 1: Attempting selective AsyncStorage clear...');
    const keys = await AsyncStorage.getAllKeys();
    const keysToRemove = keys.filter(key => !key.startsWith('firebase:auth'));

    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log(`✅ Cleared ${keysToRemove.length} keys (preserved Firebase auth)`);
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Test if storage is working now
    await AsyncStorage.setItem('__test_key__', 'test');
    await AsyncStorage.removeItem('__test_key__');
    console.log('✅ Storage recovery successful - AsyncStorage is working');
    return;
  } catch (clearError) {
    console.warn('❌ Strategy 1 failed:', clearError);
  }

  // Strategy 2: Try individual key removal (preserve Firebase auth)
  try {
    console.log('📋 Strategy 2: Attempting individual key removal...');
    const keys = await AsyncStorage.getAllKeys();
    const keysToRemove = keys.filter(key => !key.startsWith('firebase:auth'));

    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log(`✅ Removed ${keysToRemove.length} keys (preserved Firebase auth)`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return;
    }
  } catch (removeError) {
    console.warn('❌ Strategy 2 failed:', removeError);
  }

  // Strategy 3: Enable storage bypass mode for development
  if (__DEV__) {
    console.log('📋 Strategy 3: Enabling development storage bypass mode...');

    // Set a global flag to bypass AsyncStorage operations
    (global as any).__STORAGE_BYPASS_MODE__ = true;

    console.warn('🚧 DEVELOPMENT MODE: AsyncStorage bypass enabled');
    console.warn('💡 App will continue without persistent storage');
    console.warn('🔄 Manual simulator reset recommended:');
    console.warn('   1. Close iOS Simulator completely');
    console.warn('   2. Run: xcrun simctl shutdown all && xcrun simctl erase all');
    console.warn('   3. Restart: npx expo start --clear');

    return;
  }

  // Strategy 4: Production fallback (should not happen)
  console.error('❌ All storage recovery strategies failed');
  throw new Error('Critical storage corruption - manual intervention required');
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | GuestUser | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false); // ADDED: True when auth state is determined
  const [hasLocalSession, setHasLocalSession] = useState(false); // ADDED: True if local session exists
  const [sessionVerified, setSessionVerified] = useState(false); // ADDED: True after Firebase verification
  const [isGuest, setIsGuest] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false); // ADDED: Admin status
  const [adminLevel, setAdminLevel] = useState<string | null>(null); // ADDED: Admin level
  const [justRegistered, setJustRegistered] = useState(false); // ADDED: Track registration completion

  // Safe timer instance for memory leak prevention
  const safeTimer = useRef(new SafeTimer());
  const mounted = useRef(true);
  const authStateReceived = useRef(false); // Track if onAuthStateChange has fired
  const autoLoginAttempted = useRef(false); // Track if auto-login has been attempted

  /**
   * Helper to mark onboarding as completed in AsyncStorage
   * Prevents onboarding screen flash on auto-login
   */
  const markOnboardingCompleted = async () => {
    try {
      await AsyncStorage.setItem('@onboarding_completed', 'true');
      console.log('✅ Onboarding completion flag set');
    } catch (e: any) {
      console.warn('⚠️ Failed to set onboarding flag:', e?.message || e);
    }
  };

  /**
   * Check if Firebase has restored a session from persistence
   * Firebase automatically restores sessions via AsyncStorage persistence
   * We just need to wait for the auth state listener to fire
   */
  const checkFirebaseSession = async (): Promise<void> => {
    console.log('🔄 Checking for Firebase persisted session...');

    // Firebase's onAuthStateChanged will fire automatically if there's a persisted session
    // We just need to wait a moment for it to restore
    await new Promise(resolve => setTimeout(resolve, 500));

    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      console.log('✅ Firebase session restored from persistence:', currentUser.email);
      safeSetHasLocalSession(true);
    } else {
      console.log('ℹ️ No persisted Firebase session found - user needs to sign in');
      safeSetHasLocalSession(false);
    }
  };

  // Safe state setters to prevent Hermes crashes
  const safeSetUser = (newUser: User | GuestUser | null) => {
    try {
      if (mounted.current) {
        setUser(newUser);
      }
    } catch (error) {
      console.error('[AuthContext] Safe setUser failed:', error);
    }
  };

  const safeSetUserProfile = (newProfile: any | null) => {
    try {
      if (mounted.current) {
        setUserProfile(newProfile);
      }
    } catch (error) {
      console.error('[AuthContext] Safe setUserProfile failed:', error);
    }
  };

  const safeSetIsGuest = (newIsGuest: boolean) => {
    try {
      if (mounted.current) {
        setIsGuest(newIsGuest);
      }
    } catch (error) {
      console.error('[AuthContext] Safe setIsGuest failed:', error);
    }
  };

  const safeSetLoading = (newLoading: boolean) => {
    try {
      if (mounted.current) {
        setLoading(newLoading);
      }
    } catch (error) {
      console.error('[AuthContext] Safe setLoading failed:', error);
    }
  };

  const safeSetJustRegistered = (newJustRegistered: boolean) => {
    try {
      if (mounted.current) {
        setJustRegistered(newJustRegistered);
      }
    } catch (error) {
      console.error('[AuthContext] Safe setJustRegistered failed:', error);
    }
  };

  const safeSetAuthReady = (newAuthReady: boolean) => {
    try {
      if (mounted.current) {
        setAuthReady(newAuthReady);
        console.log('🎯 Auth ready state changed:', newAuthReady);
      }
    } catch (error) {
      console.error('[AuthContext] Safe setAuthReady failed:', error);
    }
  };

  const safeSetHasLocalSession = (newHasLocalSession: boolean) => {
    try {
      if (mounted.current) {
        setHasLocalSession(newHasLocalSession);
        console.log('💾 Local session state changed:', newHasLocalSession);
      }
    } catch (error) {
      console.error('[AuthContext] Safe setHasLocalSession failed:', error);
    }
  };

  const safeSetSessionVerified = (newSessionVerified: boolean) => {
    try {
      if (mounted.current) {
        setSessionVerified(newSessionVerified);
        console.log('✅ Session verified state changed:', newSessionVerified);
      }
    } catch (error) {
      console.error('[AuthContext] Safe setSessionVerified failed:', error);
    }
  };

  /**
   * Check and update admin status
   */
  const checkAdminStatus = async (firebaseUser: User) => {
    try {
      const tokenResult = await firebaseUser.getIdTokenResult();
      const adminStatus = tokenResult.claims.admin === true;
      const level = tokenResult.claims.adminLevel as string | undefined;

      if (mounted.current) {
        setIsAdmin(adminStatus);
        setAdminLevel(level || null);

        if (adminStatus) {
          console.log(`👑 Admin user detected: ${firebaseUser.email} (${level || 'admin'})`);
        }
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      if (mounted.current) {
        setIsAdmin(false);
        setAdminLevel(null);
      }
    }
  };

  /**
   * Refresh admin status (force token refresh)
   */
  const refreshAdminStatus = async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (currentUser && 'getIdTokenResult' in currentUser) {
        await checkAdminStatus(currentUser as User);
      }
    } catch (error) {
      console.error('Error refreshing admin status:', error);
    }
  };

  /**
   * Attempt auto-login with saved credentials
   * This is a fallback if Firebase persistence fails
   */
  const tryAutoLogin = async (): Promise<void> => {
    // Prevent multiple attempts
    if (autoLoginAttempted.current) {
      return;
    }

    // Don't attempt if user is already signed in
    const currentUser = authService.getCurrentUser();
    if (currentUser) {
      console.log('✅ User already signed in, skipping auto-login');
      return;
    }

    autoLoginAttempted.current = true;
    console.log('🔐 Attempting auto-login with saved credentials...');

    try {
      // Load saved credentials from secure storage
      const credentials = await secureCredentialService.getCredentials();

      if (!credentials) {
        console.log('ℹ️ No saved credentials found for auto-login');
        return;
      }

      console.log('🔑 Found saved credentials, signing in automatically...');

      // Attempt to sign in with saved credentials
      // This will trigger onAuthStateChanged which will set the user state
      await authService.signIn(credentials.email, credentials.password);

      console.log('✅ Auto-login successful');
    } catch (error: any) {
      console.warn('⚠️ Auto-login failed:', error?.message || error);
      // Clear invalid credentials
      try {
        await secureCredentialService.clearCredentials();
        console.log('🧹 Cleared invalid credentials');
      } catch (clearError) {
        console.warn('⚠️ Failed to clear invalid credentials:', clearError);
      }
      // Silent failure - don't block user from manual sign-in
    }
  };



  useEffect(() => {
    mounted.current = true;

    // Initialize session service
    const initializeSession = async () => {
      await safeAsync(async () => {
        await sessionService.initialize(() => {
          // Session expired callback
          if (mounted.current) {
            signOut();
          }
        });
      }, undefined, 'sessionService.initialize');
    };

    initializeSession();

    // Check if Firebase auth tokens exist in AsyncStorage on startup (dev only)
    if (__DEV__) {
      safeAsync(async () => {
        try {
          const keys = await AsyncStorage.getAllKeys();
          const firebaseAuthKeys = keys.filter(key => key.startsWith('firebase:auth'));
          if (firebaseAuthKeys.length > 0) {
            console.log(`[Auth] Found ${firebaseAuthKeys.length} Firebase auth key(s) in AsyncStorage`);
          } else {
            console.log('[Auth] No Firebase auth keys found in AsyncStorage');
          }
        } catch (error) {
          console.warn('[Auth] Failed to check AsyncStorage for Firebase auth keys:', error);
        }
      }, undefined, 'debug.checkFirebaseAuthKeys');
    }

    // ❌ REMOVED: checkFirebaseSession() was setting authReady too early
    // This caused a race condition where authReady = true before onAuthStateChanged fired
    // Now onAuthStateChanged is the SINGLE source of truth for authReady
    // Firebase automatically restores sessions via AsyncStorage persistence
    // We just wait for onAuthStateChanged to fire - no manual checks needed

    // Set a maximum loading time to prevent infinite loading states
    const loadingTimeout = safeTimer.current.setTimeout(async () => {
      if (!mounted.current) return;
      
      // If onAuthStateChanged hasn't fired yet, we need to manually check and set authReady
      if (!authStateReceived.current) {
        console.warn('⚠️ Authentication loading timeout - onAuthStateChanged has not fired yet');
        console.warn('⚠️ Manually checking auth state as fallback...');
        
        try {
          // Manually check current auth state
          const currentUser = authService.getCurrentUser();
          if (currentUser) {
            console.log('✅ [Timeout Fallback] Found user:', currentUser.uid);
            safeSetUser(currentUser);
            safeSetIsGuest(false);
          } else {
            console.log('ℹ️ [Timeout Fallback] No user found');
            safeSetUser(null);
            safeSetUserProfile(null);
            safeSetIsGuest(false);
          }
        } catch (error) {
          console.error('❌ [Timeout Fallback] Error checking auth state:', error);
          // On error, assume no user
          safeSetUser(null);
          safeSetUserProfile(null);
          safeSetIsGuest(false);
        }
      }
      
      // Always set loading to false and authReady to true after timeout
      // This ensures navigation can proceed even if onAuthStateChanged is delayed
      if (mounted.current) {
        safeSetLoading(false);
        safeSetAuthReady(true);
        console.log('✅ [Timeout Fallback] Set authReady = true to allow navigation');
      }
    }, 10000); // 10 second timeout

    const unsubscribe = authService.onAuthStateChange(async (firebaseUser) => {
      if (!mounted.current) return;

      // Mark that we've received the first auth state event
      authStateReceived.current = true;

      // Clear timeout since we got a response
      safeTimer.current.clearTimeout(loadingTimeout);

      // Log auth state changes
      console.log('🔐 Auth state changed:', firebaseUser ? `signed-in (${firebaseUser.uid})` : 'signed-out');
      
      // Log additional details when user is null (dev only)
      if (!firebaseUser && __DEV__) {
        try {
          const keys = await AsyncStorage.getAllKeys();
          const firebaseAuthKeys = keys.filter(key => key.startsWith('firebase:auth'));
          if (firebaseAuthKeys.length > 0) {
            console.warn('[Auth] Firebase auth keys exist but user is null - tokens may be invalid or expired');
          }
        } catch (error) {
          // Silent fail in production
        }
      }

      if (firebaseUser) {
        // Regular Firebase user - use safe setters
        safeSetUser(firebaseUser);
        safeSetIsGuest(false);

        // Check admin status
        await checkAdminStatus(firebaseUser);

        // Get user profile from Firestore with safe async wrapper
        try {
          const profile = await safeAsync(async () => {
            return await firestoreService.getUser(firebaseUser.uid);
          }, null, 'firestoreService.getUser');

          if (mounted.current) {
            if (profile && profile.username && profile.displayName) {
              // Real profile exists with proper data - use it
              console.log(`✅ Loaded existing profile for user ${firebaseUser.uid}:`, {
                displayName: profile.displayName,
                username: profile.username,
                email: profile.email,
                onboardingCompleted: profile.onboardingCompleted
              });
              safeSetUserProfile(profile);

              // CRITICAL: If profile has username and displayName, it's a complete profile
              // Mark onboarding as completed to prevent legacy accounts from getting stuck
              if (profile.onboardingCompleted !== false) {
                // If onboardingCompleted is true OR undefined (legacy accounts), mark as complete
                await safeAsync(async () => {
                  await markOnboardingCompleted();
                  console.log('✅ Onboarding flag set for existing profile (prevents onboarding loop)');
                }, undefined, 'markOnboardingCompleted.onProfileLoad');
              }

              // Start profile synchronization for this user
              await safeAsync(async () => {
                profileSyncService.startProfileSync(firebaseUser.uid);
                console.log(`✅ Profile sync started for user ${firebaseUser.uid}`);
              }, undefined, 'profileSyncService.startProfileSync');

              // Initialize encryption for existing user
              await safeAsync(async () => {
                await encryptionService.initialize(firebaseUser.uid);
              }, undefined, 'encryptionService.initialize');
            } else {
              // Profile missing or incomplete - wait for signup process to complete
              console.log(`⏳ Profile incomplete for user ${firebaseUser.uid}, waiting for signup sync...`);

              // Use safe timer for delay
              await new Promise(resolve => {
                safeTimer.current.setTimeout(() => resolve(undefined), 2000);
              });

              const updatedProfile = await safeAsync(async () => {
                return await firestoreService.getUser(firebaseUser.uid);
              }, null, 'firestoreService.getUser (retry)');

              if (updatedProfile && updatedProfile.username && updatedProfile.displayName) {
                console.log(`✅ Profile sync completed for user ${firebaseUser.uid}:`, {
                  displayName: updatedProfile.displayName,
                  username: updatedProfile.username,
                  email: updatedProfile.email,
                  onboardingCompleted: updatedProfile.onboardingCompleted
                });
                safeSetUserProfile(updatedProfile);

                // CRITICAL: If profile has username and displayName, it's a complete profile
                // Mark onboarding as completed to prevent legacy accounts from getting stuck
                if (updatedProfile.onboardingCompleted !== false) {
                  // If onboardingCompleted is true OR undefined (legacy accounts), mark as complete
                  await safeAsync(async () => {
                    await markOnboardingCompleted();
                    console.log('✅ Onboarding flag set for synced profile (prevents onboarding loop)');
                  }, undefined, 'markOnboardingCompleted.onProfileSync');
                }

                // Start profile synchronization for this user
                await safeAsync(async () => {
                  profileSyncService.startProfileSync(firebaseUser.uid);
                  console.log(`✅ Profile sync started for user ${firebaseUser.uid}`);
                }, undefined, 'profileSyncService.startProfileSync (retry)');

                // Initialize encryption for existing user
                await safeAsync(async () => {
                  await encryptionService.initialize(firebaseUser.uid);
                }, undefined, 'encryptionService.initialize (retry)');
              } else {
                // Only create fallback if this is truly a new user (not from signup flow)
                console.warn(`⚠️ No profile found after waiting - creating minimal fallback for ${firebaseUser.uid}`);
                const minimalProfile = {
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || '',
                  displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
                  username: firebaseUser.email?.split('@')[0] || `user_${firebaseUser.uid.substring(0, 8)}`,
                  photoURL: firebaseUser.photoURL || undefined,
                  gold: 0,
                  gems: 0, // Start with zero balance
                  level: 1,
                  status: 'online' as const,
                  isOnline: true,
                  lastActivity: new Date(),
                  allowFriendRequests: true,
                  allowMessagesFromStrangers: false,
                  showOnlineStatus: true,
                  friends: [],
                  blockedUsers: [],
                  bio: '',
                  customStatus: '',
                  // Subscription info (default to inactive plan)
                  subscriptionPlan: 'free' as const,
                  subscriptionStatus: 'expired' as const,
                };
                safeSetUserProfile(minimalProfile);
                // Don't create in Firestore - let signup process handle it
              }
            }
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          // Only set minimal fallback on error
          if (mounted.current && firebaseUser) {
            const errorFallbackProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
              username: firebaseUser.email?.split('@')[0] || 'user',
              photoURL: firebaseUser.photoURL,
              gold: 0,
              gems: 0, // Start with zero balance
              level: 1,
            };
            safeSetUserProfile(errorFallbackProfile);
          }
        }
      } else {
        // No Firebase user found - try auto-login as fallback
        console.log('🚫 No Firebase user found - attempting auto-login fallback...');

        if (mounted.current) {
          safeSetUser(null);
          safeSetUserProfile(null);
          safeSetIsGuest(false);
        }

        // Try auto-login if Firebase persistence failed
        await safeAsync(async () => {
          await tryAutoLogin();
        }, undefined, 'tryAutoLogin.onAuthStateChange');
      }

      if (mounted.current) {
        safeSetLoading(false);
        safeSetAuthReady(true);
      }
    });

    // Try auto-login on app startup (after waiting for Firebase to check persistence)
    safeAsync(async () => {
      // Wait a bit for Firebase to restore session from persistence
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // If no user after Firebase check, try auto-login
      const currentUser = authService.getCurrentUser();
      if (!currentUser && !autoLoginAttempted.current) {
        await tryAutoLogin();
      }
    }, undefined, 'tryAutoLogin.onStartup');

    return () => {
      mounted.current = false;
      // Clean up all timers to prevent memory leaks
      safeTimer.current.clearAll();
      unsubscribe();
      sessionService.cleanup();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const userIdentifier = email.toLowerCase().trim();

    try {
      // Check if account is locked (must be done first)
      const lockInfo = await securityService.isAccountLocked(userIdentifier);
      if (lockInfo.isLocked) {
        const remainingTime = lockInfo.lockUntil ? Math.ceil((lockInfo.lockUntil - Date.now()) / 1000 / 60) : 0;
        throw new Error(`Account temporarily locked due to too many failed attempts. Please try again in ${remainingTime} minutes.`);
      }

      // Log login attempt (fire-and-forget, don't block)
      securityService.logSecurityEvent({
        type: 'login_attempt',
        userIdentifier,
      }).catch(err => console.warn('Failed to log login attempt:', err));

      // Run these in parallel to speed up login
      const [onboardingResult, guestClearResult] = await Promise.allSettled([
        // CRITICAL: Mark onboarding as completed BEFORE Firebase sign-in
        // This prevents race condition where onAuthStateChanged fires before flag is set
        markOnboardingCompleted().then(() => {
          console.log('✅ Onboarding flag set BEFORE sign-in (prevents flash)');
        }),
        // Clear any existing guest session
        authService.clearGuestUser()
      ]);

      if (onboardingResult.status === 'rejected') {
        console.warn('⚠️ Failed to set onboarding flag:', onboardingResult.reason);
      }

      // Perform Firebase sign-in (this is the critical path)
      const firebaseUser = await authService.signIn(email, password);

      // Save credentials for auto-login fallback
      try {
        await secureCredentialService.saveCredentials(userIdentifier, password);
        console.log('✅ Credentials saved for auto-login');
      } catch (credError) {
        console.warn('⚠️ Failed to save credentials for auto-login:', credError);
        // Don't fail sign-in if credential save fails
      }

      // Run post-login operations in parallel (don't block user experience)
      Promise.allSettled([
        // Clear failed attempts on successful login
        securityService.clearFailedAttempts(userIdentifier),
        // Log successful login (fire-and-forget)
        securityService.logSecurityEvent({
          type: 'login_success',
          userIdentifier,
        }),
        // Start new session
        sessionService.startSession()
      ]).catch(err => console.warn('Post-login operations failed:', err));

      // Save profile for quick sign-in (non-guest users only)
      // Wait a bit for userProfile to be loaded by onAuthStateChanged
      setTimeout(async () => {
        try {
          if (firebaseUser && !isGuest) {
            // Get unread notification count
            let unreadCount = 0;
            try {
              const notificationService = (await import('../services/notificationService')).default;
              const counts = await notificationService.getNotificationCounts(firebaseUser.uid);
              unreadCount = counts.unread || 0;
            } catch (notifError) {
              console.warn('⚠️ Failed to fetch notification count:', notifError);
            }

            await savedProfilesService.saveProfile(
              {
                userId: firebaseUser.uid,
                email: firebaseUser.email || email,
                displayName: firebaseUser.displayName || userProfile?.displayName || email.split('@')[0],
                photoURL: firebaseUser.photoURL || userProfile?.photoURL,
              },
              password,
              unreadCount
            );
            console.log('✅ Profile saved for quick sign-in');
          }
        } catch (saveError) {
          console.warn('⚠️ Failed to save profile for quick sign-in:', saveError);
          // Don't fail the sign-in if profile save fails
        }
      }, 1000);

      // Note: Firebase persistence automatically saves the session to AsyncStorage
      // The session will be restored on next app launch via onAuthStateChanged
      console.log('✅ Sign-in successful - Firebase will persist this session');
      
      // Verify Firebase auth tokens were saved (dev only)
      if (__DEV__) {
        safeAsync(async () => {
          try {
            const keys = await AsyncStorage.getAllKeys();
            const firebaseAuthKeys = keys.filter(key => key.startsWith('firebase:auth'));
            console.log(`[Auth] After sign-in: Found ${firebaseAuthKeys.length} Firebase auth key(s) in AsyncStorage`);
          } catch (error) {
            // Silent fail in production
          }
        }, undefined, 'debug.verifyAuthKeysAfterSignIn');
      }
    } catch (error: any) {
      // Log failed login attempt
      await securityService.logSecurityEvent({
        type: 'login_failure',
        userIdentifier,
        details: { error: error.message },
      });

      // Record failed attempt and check if account should be locked
      const isLocked = await securityService.recordFailedAttempt(userIdentifier);

      if (isLocked) {
        throw new Error('Too many failed login attempts. Your account has been temporarily locked for security.');
      }

      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName: string, username: string) => {
    const userIdentifier = email.toLowerCase().trim();

    try {
      // Log signup attempt
      await securityService.logSecurityEvent({
        type: 'signup_attempt',
        userIdentifier,
        details: { username, displayName },
      });

      // Clear any existing guest session
      await authService.clearGuestUser();
      await authService.signUp(email, password, displayName, username);

      // Start new session
      await sessionService.startSession();

      // Note: Firebase persistence automatically saves the session
      // No need to manually save tokens - session will be restored on next app launch
    } catch (error: any) {
      // Enhanced error handling with proper Firebase error codes
      console.error('❌ SignUp error in AuthContext:', error);

      // Re-throw with proper error information for UI handling
      if (error.code === 'auth/email-already-in-use') {
        const enhancedError = new Error('This email is already registered. Please sign in instead or use a different email.');
        (enhancedError as any).code = 'auth/email-already-in-use';
        throw enhancedError;
      } else if (error.code === 'auth/username-already-in-use') {
        const enhancedError = new Error('This username is already taken. Please choose a different username.');
        (enhancedError as any).code = 'auth/username-already-in-use';
        throw enhancedError;
      } else if (error.code === 'auth/weak-password') {
        const enhancedError = new Error('Password is too weak. Please choose a stronger password with at least 6 characters.');
        (enhancedError as any).code = 'auth/weak-password';
        throw enhancedError;
      } else if (error.code === 'auth/invalid-email') {
        const enhancedError = new Error('Please enter a valid email address.');
        (enhancedError as any).code = 'auth/invalid-email';
        throw enhancedError;
      } else if (error.code === 'auth/username-check-failed') {
        const enhancedError = new Error('Unable to verify username availability. Please check your connection and try again.');
        (enhancedError as any).code = 'auth/username-check-failed';
        throw enhancedError;
      }

      // For other errors, re-throw as-is
      throw error;
    }
  };

  const signInAsGuest = async () => {
    try {
      // Clear any existing Firebase session
      await authService.signOut();

      // Reset presence service for guest users
      PresenceService.resetInstance();

      // Also emergency stop any running operations
      const presenceService = PresenceService.getInstance();
      presenceService.emergencyStop();

      const guestUser = await authService.signInAsGuest();
      safeSetUser(guestUser);
      safeSetIsGuest(true);

      // Create guest profile
      const guestProfile = {
        uid: guestUser.uid,
        email: null,
        displayName: 'Guest',
        username: 'guest',
        photoURL: null, // No default avatar
        gold: 0, // Start with zero balance
        gems: 0, // Start with zero balance
        level: 1,
        isGuest: true,
        guestId: guestUser.guestId,
      };
      safeSetUserProfile(guestProfile);
    } catch (error) {
      throw error;
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Starting full sign-out process...');

      // Stop profile synchronization
      if (user && !isGuest) {
        profileSyncService.stopProfileSync(user.uid);
      }

      // Reset presence service to stop any Firebase operations
      PresenceService.resetInstance();

      // Also emergency stop any running operations
      const presenceService = PresenceService.getInstance();
      presenceService.emergencyStop();

      // Clear guest user state immediately using safe setters
      safeSetUser(null);
      safeSetUserProfile(null);
      safeSetIsGuest(false);

      // Clear any saved credentials and session tokens from secure storage
      try {
        await secureCredentialService.clearCredentials();
        await secureCredentialService.clearSessionToken();
        console.log('✅ Secure storage cleared');
        safeSetHasLocalSession(false);
        safeSetSessionVerified(false);

        // NOTE: We do NOT clear saved profiles here - they persist for quick sign-in
        // Users can manually remove profiles from the login screen if desired
      } catch (error) {
        console.warn('⚠️ Failed to clear secure storage:', error);
        // Continue with sign-out even if clearing fails
      }

      // CRITICAL FIX: Clear ALL cached authentication data with error handling
      console.log('🧹 Clearing AsyncStorage authentication data...');
      await safeAsyncStorage.multiRemove([
        'guestUser',
        'userProfile',
        'authToken',
        'lastLoginMethod',
        'rememberMe',
        '@onboarding_completed' // Clear onboarding flag on sign-out
      ]);

      // End session
      await sessionService.endSession();

      // Sign out from social providers
      if (socialAuthService) {
        await socialAuthService.signOut();
      }

      // Then clear the actual session
      await authService.signOut();

      // Reset auto-login attempt flag
      autoLoginAttempted.current = false;

      console.log('✅ SIGN-OUT COMPLETE: All credentials, session tokens, and cached data cleared');
      console.log('🔒 User will need to sign in again on next app launch (auto-login disabled)');
    } catch (error) {
      console.error('❌ Sign out error:', error);
      throw error;
    }
  };

  // ADDED: Clear all authentication cache (for debugging automatic sign-in issues)
  const clearAuthCache = async (): Promise<void> => {
    try {
      console.log('🧹 Clearing all authentication cache...');

      // Stop profile synchronization
      if (user && !isGuest) {
        profileSyncService.stopProfileSync(user.uid);
      }

      // Reset presence service to stop any Firebase operations
      PresenceService.resetInstance();

      // Also emergency stop any running operations
      const presenceService = PresenceService.getInstance();
      presenceService.emergencyStop();

      // Clear saved credentials
      try {
        await secureCredentialService.clearCredentials();
      } catch (credError) {
        console.warn('⚠️ Failed to clear saved credentials:', credError);
      }

      // Clear saved session token
      try {
        await secureCredentialService.clearSessionToken();
        safeSetHasLocalSession(false);
        safeSetSessionVerified(false);
      } catch (tokenError) {
        console.warn('⚠️ Failed to clear session token:', tokenError);
      }

      // Clear AsyncStorage with enhanced error handling
      await safeAsyncStorage.multiRemove([
        'guestUser',
        'userProfile',
        'authToken',
        'lastLoginMethod',
        'rememberMe'
      ]);

      // Sign out from Firebase
      await authService.signOut();

      // Reset auto-login attempt flag
      autoLoginAttempted.current = false;

      // Clear state using safe setters
      safeSetUser(null);
      safeSetUserProfile(null);
      safeSetIsGuest(false);

      console.log('✅ Authentication cache cleared completely');
    } catch (error: any) {
      console.error('❌ Error clearing auth cache:', error);
      // Still try to clear state even if storage operations fail
      safeSetUser(null);
      safeSetUserProfile(null);
      safeSetIsGuest(false);
    }
  };

  const updateUserProfile = async (updates: any) => {
    if (!user) return;

    // Don't allow guest users to update their profile
    if (isGuest) {
      console.warn('Guest users cannot update their profile');
      return;
    }

    try {
      console.log(`🔄 Updating user profile for ${user.uid}:`, updates);
      await firestoreService.updateUser(user.uid, updates);
      console.log(`✅ Firestore update successful, updating local state...`);
      safeSetUserProfile(prev => {
        const newProfile = { ...prev, ...updates };
        console.log(`🔄 Profile state updated:`, {
          before: { displayName: prev?.displayName, username: prev?.username },
          after: { displayName: newProfile.displayName, username: newProfile.username }
        });
        return newProfile;
      });

      // Sync profile changes to conversations automatically
      // The profileSyncService listener will handle this, but we can also trigger it manually
      // for immediate updates if needed
      if (updates.displayName || updates.photoURL) {
        try {
          console.log(`🔄 Manually syncing profile changes for user ${user.uid}...`);
          await profileSyncService.syncProfileToConversations(user.uid, {
            displayName: updates.displayName,
            photoURL: updates.photoURL,
            username: updates.username,
            bio: updates.bio,
            customStatus: updates.customStatus
          });
          console.log(`✅ Profile changes synced successfully for user ${user.uid}`);
        } catch (syncError) {
          console.error('Failed to sync profile changes to conversations:', {
            userId: user.uid,
            updates,
            error: syncError,
            errorCode: syncError?.code,
            errorMessage: syncError?.message
          });
          // Don't throw the error - profile update succeeded, sync failure is not critical
          // The automatic sync listener will retry later
        }
      }
    } catch (error) {
      throw error;
    }
  };

  const sendPasswordResetEmail = async (email: string) => {
    try {
      await authService.sendPasswordResetEmail(email);
    } catch (error) {
      throw error;
    }
  };

  const sendEmailVerification = async () => {
    try {
      await authService.sendEmailVerification();
    } catch (error) {
      throw error;
    }
  };

  const isEmailVerified = (): boolean => {
    return authService.isEmailVerified();
  };

  const updateUserEmail = async (newEmail: string, currentPassword: string) => {
    try {
      await authService.updateEmail(newEmail, currentPassword);
      // Update local user profile
      if (userProfile) {
        safeSetUserProfile(prev => ({ ...prev, email: newEmail }));
      }
    } catch (error) {
      throw error;
    }
  };

  const deleteAccount = async (currentPassword: string) => {
    try {
      await authService.deleteAccount(currentPassword);
      // End session
      await sessionService.endSession();
      // Clear local state using safe setters
      safeSetUser(null);
      safeSetUserProfile(null);
      safeSetIsGuest(false);
    } catch (error) {
      throw error;
    }
  };

  const updateActivity = () => {
    sessionService.updateActivity();
  };

  const getSessionData = () => {
    return sessionService.getSessionData();
  };

  const signInWithGoogle = async () => {
    if (!socialAuthService) {
      throw new Error('Google Sign-In is not available. Please use a development build to enable Google Sign-In functionality.');
    }
    try {
      await socialAuthService.signInWithGoogle();
      // Start new session
      await sessionService.startSession();
    } catch (error) {
      throw error;
    }
  };

  const signInWithApple = async () => {
    if (!socialAuthService) {
      throw new Error('Social authentication is not available.');
    }
    try {
      await socialAuthService.signInWithApple();
      // Start new session
      await sessionService.startSession();
    } catch (error) {
      throw error;
    }
  };

  const getSocialAuthMethods = () => {
    if (!socialAuthService) {
      return { google: false, apple: false }; // No social auth methods available when service is missing
    }
    return socialAuthService.getAvailableMethods();
  };

  // Onboarding methods
  const completeOnboarding = async (onboardingData: any) => {
    try {
      // Update user profile with onboarding data
      if (user && userProfile) {
        const updates = {
          ...onboardingData,
          onboardingCompleted: true,
          onboardingCompletedAt: new Date().toISOString(),
        };
        await updateUserProfile(updates);
      }

      // Mark onboarding as complete in AsyncStorage
      await AsyncStorage.setItem('@onboarding_completed', 'true');
    } catch (error) {
      // Handle AsyncStorage errors gracefully in development environment
      if (error instanceof Error && error.message.includes('storage directory')) {
        console.warn('AsyncStorage unavailable in development environment, onboarding completion not persisted');
        // Don't throw error - allow onboarding to complete even if storage fails
      } else {
        console.error('Error completing onboarding:', error);
        throw error;
      }
    }
  };

  const isOnboardingComplete = async (): Promise<boolean> => {
    try {
      const completed = await AsyncStorage.getItem('@onboarding_completed');
      return completed === 'true';
    } catch (error) {
      // Handle AsyncStorage errors gracefully in development environment
      console.warn('AsyncStorage unavailable in development environment, defaulting to incomplete onboarding');
      return false;
    }
  };

  // ADDED: Mark registration as complete to skip onboarding
  const markRegistrationComplete = () => {
    console.log('✅ Marking registration as complete - will skip onboarding');
    safeSetJustRegistered(true);
  };

  // ADDED: Clear registration flag (called when user reaches main app)
  const clearRegistrationFlag = () => {
    console.log('🔄 Clearing registration flag');
    safeSetJustRegistered(false);
  };

  const value: AuthContextType = {
    user,
    userProfile,
    loading,
    authReady, // ADDED: True when auth state is determined
    hasLocalSession, // ADDED: True if local session exists
    sessionVerified, // ADDED: True after Firebase verification
    isGuest,
    isAdmin, // ADDED: Admin status
    adminLevel, // ADDED: Admin level
    justRegistered, // ADDED: Registration completion flag
    signIn,
    signUp,
    signInAsGuest,
    signOut,
    clearAuthCache, // ADDED: For debugging automatic sign-in issues
    updateUserProfile,
    sendPasswordResetEmail,
    sendEmailVerification,
    isEmailVerified,
    updateUserEmail,
    deleteAccount,
    updateActivity,
    getSessionData,
    signInWithGoogle,
    signInWithApple,
    getSocialAuthMethods,
    refreshAdminStatus, // ADDED: Refresh admin status
    completeOnboarding,
    isOnboardingComplete,
    markRegistrationComplete,
    clearRegistrationFlag,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 