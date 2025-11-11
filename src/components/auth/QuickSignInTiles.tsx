/**
 * Quick Sign-In Tiles Component
 * Displays saved user profiles for one-tap sign-in with notification badges
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { savedProfilesService, SavedProfile } from '../../services/savedProfilesService';
import { AuthColors, AuthTypography, AuthSpacing, AuthLayout } from './AuthDesignSystem';
import * as LocalAuthentication from 'expo-local-authentication';
import notificationService from '../../services/notificationService';

interface QuickSignInTilesProps {
  onProfileSelect: (profile: SavedProfile, password: string) => Promise<void>;
  onRemoveProfile?: (userId: string) => void;
}

const QuickSignInTiles: React.FC<QuickSignInTilesProps> = ({
  onProfileSelect,
  onRemoveProfile,
}) => {
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingInUserId, setSigningInUserId] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    loadProfiles();
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      // Check if LocalAuthentication methods are available (not available in Expo Go)
      if (!LocalAuthentication.hasHardwareAsync || !LocalAuthentication.isEnrolledAsync) {
        console.log('⚠️ Biometric authentication not available (Expo Go limitation)');
        setBiometricAvailable(false);
        return;
      }

      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(compatible && enrolled);

      if (compatible && enrolled) {
        console.log('✅ Biometric authentication available');
      }
    } catch (error) {
      console.warn('⚠️ Error checking biometric status:', error);
      setBiometricAvailable(false);
    }
  };

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const savedProfiles = await savedProfilesService.getSavedProfiles();
      setProfiles(savedProfiles);

      // Load unread counts for each profile
      await loadUnreadCounts(savedProfiles);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCounts = async (profileList: SavedProfile[]) => {
    const counts: Record<string, number> = {};

    // Load unread counts in parallel
    await Promise.all(
      profileList.map(async (profile) => {
        try {
          // First try to use cached count from profile
          if (profile.unreadNotifications !== undefined) {
            counts[profile.userId] = profile.unreadNotifications;
          } else {
            // Fallback: fetch from notification service (lightweight query)
            const notifCounts = await notificationService.getNotificationCounts(profile.userId);
            counts[profile.userId] = notifCounts.unread || 0;

            // Update cached count in profile
            await savedProfilesService.updateUnreadCount(profile.userId, counts[profile.userId]);
          }
        } catch (error) {
          // Silently fail - don't show badge if we can't fetch count
          console.warn(`⚠️ Failed to load unread count for ${profile.userId}:`, error);
          counts[profile.userId] = 0;
        }
      })
    );

    setUnreadCounts(counts);
  };

  const handleProfilePress = async (profile: SavedProfile) => {
    try {
      setSigningInUserId(profile.userId);

      // Optional: Request biometric authentication before using stored password
      if (biometricAvailable && Platform.OS !== 'web') {
        const biometricResult = await LocalAuthentication.authenticateAsync({
          promptMessage: `Sign in as ${profile.displayName}`,
          fallbackLabel: 'Use password instead',
          cancelLabel: 'Cancel',
        });

        if (!biometricResult.success) {
          setSigningInUserId(null);
          return;
        }
      }

      // Get stored credentials
      const credentials = await savedProfilesService.getProfileCredentials(profile.userId);
      
      if (!credentials) {
        Alert.alert(
          'Credentials Not Found',
          'Please sign in manually to save your credentials again.',
          [{ text: 'OK' }]
        );
        setSigningInUserId(null);
        return;
      }

      // Call the sign-in handler
      await onProfileSelect(profile, credentials.password);

      // Update lastUsed timestamp and refresh metadata
      await savedProfilesService.refreshProfileMeta(profile.userId);
      
    } catch (error: any) {
      console.error('Quick sign-in failed:', error);
      Alert.alert(
        'Sign-In Failed',
        error.message || 'Failed to sign in. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setSigningInUserId(null);
    }
  };

  const handleRemoveProfile = (profile: SavedProfile) => {
    Alert.alert(
      'Remove Account',
      `Remove ${profile.displayName} from quick sign-in?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await savedProfilesService.removeProfile(profile.userId);
              setProfiles(prev => prev.filter(p => p.userId !== profile.userId));
              
              if (onRemoveProfile) {
                onRemoveProfile(profile.userId);
              }
            } catch (error) {
              console.error('Failed to remove profile:', error);
              Alert.alert('Error', 'Failed to remove profile');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={AuthColors.primary} />
      </View>
    );
  }

  if (profiles.length === 0) {
    return null; // Don't show anything if no profiles
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quick Sign-In</Text>
      <View style={styles.tilesContainer}>
        {profiles.map((profile) => {
          const isLoading = signingInUserId === profile.userId;
          const unreadCount = unreadCounts[profile.userId] || 0;

          return (
            <TouchableOpacity
              key={profile.userId}
              style={styles.tileWrapper}
              onPress={() => handleProfilePress(profile)}
              disabled={signingInUserId !== null}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#1e2230', '#151924']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.tile}
              >
                {/* Remove button */}
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveProfile(profile)}
                  disabled={signingInUserId !== null}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View style={styles.removeButtonCircle}>
                    <Ionicons name="close" size={14} color="#fff" />
                  </View>
                </TouchableOpacity>

                {/* Notification Badge */}
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}

                {/* Avatar */}
                <View style={styles.avatarContainer}>
                  {profile.photoURL ? (
                    <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
                  ) : (
                    <LinearGradient
                      colors={['#5865F2', '#4752c4']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.avatarPlaceholder}
                    >
                      <Text style={styles.avatarInitial}>{profile.initial}</Text>
                    </LinearGradient>
                  )}

                  {/* Avatar border ring */}
                  <View style={styles.avatarRing} />

                  {/* Loading indicator */}
                  {isLoading && (
                    <View style={styles.loadingOverlay}>
                      <ActivityIndicator size="small" color="#fff" />
                    </View>
                  )}
                </View>

                {/* Profile info */}
                <Text style={styles.displayName} numberOfLines={1}>
                  {profile.displayName}
                </Text>
                <Text style={styles.email} numberOfLines={1}>
                  {profile.email}
                </Text>

                {/* Biometric indicator */}
                {biometricAvailable && !isLoading && (
                  <View style={styles.biometricBadge}>
                    <Ionicons name="finger-print" size={14} color="#5865F2" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: AuthSpacing.xl,
    marginTop: AuthSpacing.md,
  },
  loadingContainer: {
    padding: AuthSpacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: AuthColors.primaryText,
    marginBottom: AuthSpacing.lg,
    textAlign: 'center',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tilesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: AuthSpacing.md,
  },
  tileWrapper: {
    // Wrapper for shadow on iOS
    borderRadius: 16,
    ...AuthLayout.shadow.md,
  },
  tile: {
    width: 130,
    alignItems: 'center',
    padding: AuthSpacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(88, 101, 242, 0.2)',
    position: 'relative',
    overflow: 'hidden',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
  },
  removeButtonCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(237, 66, 69, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...AuthLayout.shadow.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ed4245',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    zIndex: 10,
    ...AuthLayout.shadow.md,
  },
  notificationBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    marginBottom: AuthSpacing.sm,
    marginTop: AuthSpacing.xs,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: AuthColors.inputBackground,
    borderWidth: 3,
    borderColor: 'rgba(88, 101, 242, 0.3)',
  },
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(88, 101, 242, 0.5)',
  },
  avatarRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: 'rgba(88, 101, 242, 0.3)',
    pointerEvents: 'none',
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 15,
    fontWeight: '700',
    color: AuthColors.primaryText,
    marginBottom: 4,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  email: {
    fontSize: 12,
    fontWeight: '500',
    color: AuthColors.secondaryText,
    textAlign: 'center',
    opacity: 0.8,
  },
  biometricBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(30, 34, 48, 0.95)',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1.5,
    borderColor: '#5865F2',
    ...AuthLayout.shadow.sm,
  },
});

export default QuickSignInTiles;

