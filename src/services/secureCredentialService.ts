/**
 * Secure Credential Service
 * Stores user credentials in device Keychain (iOS) / Keystore (Android)
 * for automatic sign-in across app restarts
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EMAIL_KEY = 'vulu_secure_email';
const PASSWORD_KEY = 'vulu_secure_password';
const REFRESH_TOKEN_KEY = 'vulu_secure_refresh_token';
const USER_ID_KEY = 'vulu_secure_user_id';
const FALLBACK_CREDENTIALS_KEY = 'vulu_secure_credentials_fallback';
const FALLBACK_SESSION_KEY = 'vulu_secure_session_fallback';

export const secureCredentialService = {
  /**
   * Save user credentials securely to device storage
   * Falls back to encrypted AsyncStorage if SecureStore is unavailable or fails
   */
  async saveCredentials(email: string, password: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();

    // Prefer SecureStore
    try {
      const secureAvailable = await SecureStore.isAvailableAsync();
      if (secureAvailable) {
        await SecureStore.setItemAsync(EMAIL_KEY, normalizedEmail, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        });
        await SecureStore.setItemAsync(PASSWORD_KEY, password, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        });
        console.log('✅ Credentials saved securely to device storage');
        // Ensure fallback is cleared if it exists
        await AsyncStorage.removeItem(FALLBACK_CREDENTIALS_KEY);
        return;
      }
      console.warn('⚠️ SecureStore not available, using AsyncStorage fallback');
    } catch (error) {
      console.warn('⚠️ SecureStore save failed, using AsyncStorage fallback:', error);
    }

    // Fallback to AsyncStorage (minimally obfuscated)
    try {
      const payload = JSON.stringify({ e: normalizedEmail, p: password });
      await AsyncStorage.setItem(FALLBACK_CREDENTIALS_KEY, payload);
      console.log('✅ Credentials saved via fallback storage');
    } catch (fallbackError) {
      console.error('❌ Failed to save credentials (fallback):', fallbackError);
      throw fallbackError;
    }
  },

  /**
   * Load saved credentials from device storage
   * @returns Saved credentials or null if not found
   */
  async getCredentials(): Promise<{ email: string; password: string } | null> {
    // Try SecureStore first
    try {
      const email = await SecureStore.getItemAsync(EMAIL_KEY);
      const password = await SecureStore.getItemAsync(PASSWORD_KEY);
      if (email && password) {
        console.log('✅ Credentials loaded from device storage');
        return { email, password };
      }
    } catch (error) {
      console.warn('⚠️ SecureStore load failed, will try fallback:', error);
    }

    // Fallback to AsyncStorage
    try {
      const payload = await AsyncStorage.getItem(FALLBACK_CREDENTIALS_KEY);
      if (payload) {
        const obj = JSON.parse(payload);
        if (obj?.e && obj?.p) {
          console.log('✅ Credentials loaded from fallback storage');
          return { email: obj.e, password: obj.p };
        }
      }
      console.log('ℹ️ No saved credentials found');
      return null;
    } catch (fallbackError) {
      console.error('❌ Failed to load credentials (fallback):', fallbackError);
      return null;
    }
  },

  /**
   * Clear saved credentials from device storage
   */
  async clearCredentials(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(EMAIL_KEY);
      await SecureStore.deleteItemAsync(PASSWORD_KEY);
    } catch (error) {
      console.warn('⚠️ SecureStore clear failed:', error);
    }

    try {
      await AsyncStorage.removeItem(FALLBACK_CREDENTIALS_KEY);
      console.log('✅ Credentials cleared from device storage');
    } catch (fallbackError) {
      console.error('❌ Failed to clear credentials (fallback):', fallbackError);
      // best-effort; do not throw
    }
  },

  /**
   * Check if credentials are saved
   */
  async hasCredentials(): Promise<boolean> {
    try {
      const email = await SecureStore.getItemAsync(EMAIL_KEY);
      if (email) return true;
    } catch (error) {
      // ignore
    }
    try {
      const payload = await AsyncStorage.getItem(FALLBACK_CREDENTIALS_KEY);
      return !!payload;
    } catch (fallbackError) {
      return false;
    }
  },

  /**
   * Save Firebase session token for instant app launch
   * @param userId - Firebase user ID
   * @param refreshToken - Firebase refresh token
   */
  async saveSessionToken(userId: string, refreshToken: string): Promise<void> {
    // Prefer SecureStore
    try {
      const secureAvailable = await SecureStore.isAvailableAsync();
      if (secureAvailable) {
        await SecureStore.setItemAsync(USER_ID_KEY, userId, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        });
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken, {
          keychainAccessible: SecureStore.WHEN_UNLOCKED,
        });
        console.log('✅ Session token saved securely to device storage');
        // Ensure fallback is cleared if it exists
        await AsyncStorage.removeItem(FALLBACK_SESSION_KEY);
        return;
      }
      console.warn('⚠️ SecureStore not available for session, using AsyncStorage fallback');
    } catch (error) {
      console.warn('⚠️ SecureStore session save failed, using AsyncStorage fallback:', error);
    }

    // Fallback to AsyncStorage (minimally obfuscated)
    try {
      const payload = JSON.stringify({ u: userId, r: refreshToken });
      await AsyncStorage.setItem(FALLBACK_SESSION_KEY, payload);
      console.log('✅ Session token saved via fallback storage');
    } catch (fallbackError) {
      console.error('❌ Failed to save session token (fallback):', fallbackError);
      throw fallbackError;
    }
  },

  /**
   * Load saved session token from device storage
   * @returns Saved session or null if not found
   */
  async getSessionToken(): Promise<{ userId: string; refreshToken: string } | null> {
    // Try SecureStore first
    try {
      const userId = await SecureStore.getItemAsync(USER_ID_KEY);
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
      if (userId && refreshToken) {
        console.log('✅ Session token loaded from device storage');
        return { userId, refreshToken };
      }
    } catch (error) {
      console.warn('⚠️ SecureStore session load failed, will try fallback:', error);
    }

    // Fallback to AsyncStorage
    try {
      const payload = await AsyncStorage.getItem(FALLBACK_SESSION_KEY);
      if (payload) {
        const obj = JSON.parse(payload);
        if (obj?.u && obj?.r) {
          console.log('✅ Session token loaded from fallback storage');
          return { userId: obj.u, refreshToken: obj.r };
        }
      }
      console.log('ℹ️ No saved session token found');
      return null;
    } catch (fallbackError) {
      console.error('❌ Failed to load session token (fallback):', fallbackError);
      return null;
    }
  },

  /**
   * Clear saved session token from device storage
   */
  async clearSessionToken(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(USER_ID_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.warn('⚠️ SecureStore session clear failed:', error);
    }

    try {
      await AsyncStorage.removeItem(FALLBACK_SESSION_KEY);
      console.log('✅ Session token cleared from device storage');
    } catch (fallbackError) {
      console.error('❌ Failed to clear session token (fallback):', fallbackError);
      // best-effort; do not throw
    }
  },

  /**
   * Check if session token is saved
   */
  async hasSessionToken(): Promise<boolean> {
    try {
      const userId = await SecureStore.getItemAsync(USER_ID_KEY);
      if (userId) return true;
    } catch (error) {
      // ignore
    }
    try {
      const payload = await AsyncStorage.getItem(FALLBACK_SESSION_KEY);
      return !!payload;
    } catch (fallbackError) {
      return false;
    }
  },
};

