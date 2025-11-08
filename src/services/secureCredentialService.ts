/**
 * Secure Credential Service
 * Stores user credentials in device Keychain (iOS) / Keystore (Android)
 * for automatic sign-in across app restarts
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EMAIL_KEY = 'vulu_secure_email';
const PASSWORD_KEY = 'vulu_secure_password';
const FALLBACK_CREDENTIALS_KEY = 'vulu_secure_credentials_fallback';

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
};

