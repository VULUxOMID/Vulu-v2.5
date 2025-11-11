/**
 * Saved Profiles Service
 * Manages cached user profiles for quick sign-in
 * Stores lightweight profile data (displayName, email, photoURL, userId, lastUsed)
 * Uses SecureStore for encrypted credential storage
 */

import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILES_LIST_KEY = 'vulu_saved_profiles_list';
const PROFILE_CREDENTIAL_PREFIX = 'vulu_profile_cred_';
const MAX_SAVED_PROFILES = 5; // Limit to prevent storage bloat

export interface SavedProfile {
  userId: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  lastUsed: number; // timestamp
  initial?: string; // First letter of displayName for avatar fallback
  unreadNotifications?: number; // Cached unread notification count
}

interface ProfileCredentials {
  email: string;
  password: string;
}

export const savedProfilesService = {
  /**
   * Get all saved profiles, sorted by lastUsed (most recent first)
   */
  async getSavedProfiles(): Promise<SavedProfile[]> {
    try {
      const profilesJson = await AsyncStorage.getItem(PROFILES_LIST_KEY);
      if (!profilesJson) {
        return [];
      }

      const profiles: SavedProfile[] = JSON.parse(profilesJson);
      // Sort by lastUsed descending (most recent first)
      return profiles.sort((a, b) => b.lastUsed - a.lastUsed);
    } catch (error) {
      console.error('❌ Failed to load saved profiles:', error);
      return [];
    }
  },

  /**
   * Save or update a profile after successful sign-in
   * @param profile - Profile data to save
   * @param password - User password (stored securely)
   * @param unreadCount - Optional unread notification count to cache
   */
  async saveProfile(
    profile: Omit<SavedProfile, 'lastUsed' | 'initial' | 'unreadNotifications'>,
    password: string,
    unreadCount?: number
  ): Promise<void> {
    try {
      // Get existing profiles
      const profiles = await this.getSavedProfiles();

      // Check if profile already exists
      const existingIndex = profiles.findIndex(p => p.userId === profile.userId);

      // Generate initial from displayName
      const initial = profile.displayName?.charAt(0).toUpperCase() || profile.email.charAt(0).toUpperCase();

      const updatedProfile: SavedProfile = {
        ...profile,
        initial,
        lastUsed: Date.now(),
        unreadNotifications: unreadCount ?? 0,
      };

      if (existingIndex >= 0) {
        // Update existing profile
        profiles[existingIndex] = updatedProfile;
        console.log(`✅ Updated saved profile for ${profile.email}`);
      } else {
        // Add new profile
        profiles.push(updatedProfile);
        console.log(`✅ Added new saved profile for ${profile.email}`);

        // Enforce max profiles limit (remove oldest)
        if (profiles.length > MAX_SAVED_PROFILES) {
          const sorted = profiles.sort((a, b) => b.lastUsed - a.lastUsed);
          const removed = sorted.slice(MAX_SAVED_PROFILES);
          
          // Remove credentials for deleted profiles
          for (const removedProfile of removed) {
            await this.removeProfileCredentials(removedProfile.userId);
          }
          
          profiles.splice(0, profiles.length, ...sorted.slice(0, MAX_SAVED_PROFILES));
          console.log(`🧹 Removed ${removed.length} oldest profile(s) to enforce limit`);
        }
      }

      // Save updated profiles list
      await AsyncStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(profiles));

      // Save credentials securely
      await this.saveProfileCredentials(profile.userId, profile.email, password);

      console.log(`✅ Saved profile for ${profile.email} (total: ${profiles.length})`);
    } catch (error) {
      console.error('❌ Failed to save profile:', error);
      throw error;
    }
  },

  /**
   * Update lastUsed timestamp for a profile
   */
  async updateLastUsed(userId: string): Promise<void> {
    try {
      const profiles = await this.getSavedProfiles();
      const profile = profiles.find(p => p.userId === userId);

      if (profile) {
        profile.lastUsed = Date.now();
        await AsyncStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(profiles));
        console.log(`✅ Updated lastUsed for profile ${userId}`);
      }
    } catch (error) {
      console.error('❌ Failed to update lastUsed:', error);
    }
  },

  /**
   * Update unread notification count for a profile
   */
  async updateUnreadCount(userId: string, unreadCount: number): Promise<void> {
    try {
      const profiles = await this.getSavedProfiles();
      const profile = profiles.find(p => p.userId === userId);

      if (profile) {
        profile.unreadNotifications = unreadCount;
        await AsyncStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(profiles));
        console.log(`✅ Updated unread count for profile ${userId}: ${unreadCount}`);
      }
    } catch (error) {
      console.error('❌ Failed to update unread count:', error);
    }
  },

  /**
   * Refresh profile metadata (lastUsed and unread count)
   */
  async refreshProfileMeta(userId: string, unreadCount?: number): Promise<void> {
    try {
      const profiles = await this.getSavedProfiles();
      const profile = profiles.find(p => p.userId === userId);

      if (profile) {
        profile.lastUsed = Date.now();
        if (unreadCount !== undefined) {
          profile.unreadNotifications = unreadCount;
        }
        await AsyncStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(profiles));
        console.log(`✅ Refreshed profile metadata for ${userId}`);
      }
    } catch (error) {
      console.error('❌ Failed to refresh profile metadata:', error);
    }
  },

  /**
   * Remove a saved profile and its credentials
   */
  async removeProfile(userId: string): Promise<void> {
    try {
      const profiles = await this.getSavedProfiles();
      const filteredProfiles = profiles.filter(p => p.userId !== userId);

      await AsyncStorage.setItem(PROFILES_LIST_KEY, JSON.stringify(filteredProfiles));
      await this.removeProfileCredentials(userId);

      console.log(`✅ Removed saved profile ${userId}`);
    } catch (error) {
      console.error('❌ Failed to remove profile:', error);
      throw error;
    }
  },

  /**
   * Get credentials for a specific profile
   */
  async getProfileCredentials(userId: string): Promise<ProfileCredentials | null> {
    try {
      const key = `${PROFILE_CREDENTIAL_PREFIX}${userId}`;
      
      // Try SecureStore first
      try {
        const credJson = await SecureStore.getItemAsync(key);
        if (credJson) {
          const cred = JSON.parse(credJson);
          return cred;
        }
      } catch (secureError) {
        console.warn('⚠️ SecureStore read failed, trying AsyncStorage fallback:', secureError);
      }

      // Fallback to AsyncStorage
      const credJson = await AsyncStorage.getItem(key);
      if (credJson) {
        const cred = JSON.parse(credJson);
        return cred;
      }

      return null;
    } catch (error) {
      console.error('❌ Failed to get profile credentials:', error);
      return null;
    }
  },

  /**
   * Save credentials for a profile (private method)
   */
  async saveProfileCredentials(userId: string, email: string, password: string): Promise<void> {
    try {
      const key = `${PROFILE_CREDENTIAL_PREFIX}${userId}`;
      const credentials: ProfileCredentials = {
        email: email.toLowerCase().trim(),
        password,
      };
      const credJson = JSON.stringify(credentials);

      // Try SecureStore first
      try {
        const secureAvailable = await SecureStore.isAvailableAsync();
        if (secureAvailable) {
          await SecureStore.setItemAsync(key, credJson, {
            keychainAccessible: SecureStore.WHEN_UNLOCKED,
          });
          console.log(`✅ Credentials saved securely for profile ${userId}`);
          return;
        }
      } catch (secureError) {
        console.warn('⚠️ SecureStore save failed, using AsyncStorage fallback:', secureError);
      }

      // Fallback to AsyncStorage
      await AsyncStorage.setItem(key, credJson);
      console.log(`✅ Credentials saved via fallback for profile ${userId}`);
    } catch (error) {
      console.error('❌ Failed to save profile credentials:', error);
      throw error;
    }
  },

  /**
   * Remove credentials for a profile (private method)
   */
  async removeProfileCredentials(userId: string): Promise<void> {
    try {
      const key = `${PROFILE_CREDENTIAL_PREFIX}${userId}`;

      // Try SecureStore
      try {
        await SecureStore.deleteItemAsync(key);
      } catch (secureError) {
        // Ignore errors
      }

      // Also try AsyncStorage
      try {
        await AsyncStorage.removeItem(key);
      } catch (asyncError) {
        // Ignore errors
      }

      console.log(`✅ Credentials removed for profile ${userId}`);
    } catch (error) {
      console.error('❌ Failed to remove profile credentials:', error);
    }
  },

  /**
   * Clear all saved profiles and credentials
   */
  async clearAllProfiles(): Promise<void> {
    try {
      const profiles = await this.getSavedProfiles();

      // Remove all credentials
      for (const profile of profiles) {
        await this.removeProfileCredentials(profile.userId);
      }

      // Clear profiles list
      await AsyncStorage.removeItem(PROFILES_LIST_KEY);

      console.log('✅ All saved profiles cleared');
    } catch (error) {
      console.error('❌ Failed to clear all profiles:', error);
      throw error;
    }
  },

  /**
   * Check if a profile exists
   */
  async hasProfile(userId: string): Promise<boolean> {
    try {
      const profiles = await this.getSavedProfiles();
      return profiles.some(p => p.userId === userId);
    } catch (error) {
      return false;
    }
  },

  /**
   * Get profile count
   */
  async getProfileCount(): Promise<number> {
    try {
      const profiles = await this.getSavedProfiles();
      return profiles.length;
    } catch (error) {
      return 0;
    }
  },
};

