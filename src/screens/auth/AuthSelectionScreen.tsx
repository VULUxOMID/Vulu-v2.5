import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { AuthColors, AuthTypography } from '../../components/auth/AuthDesignSystem';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import QuickSignInTiles from '../../components/auth/QuickSignInTiles';
import type { SavedProfile } from '../../services/savedProfilesService';

const { width } = Dimensions.get('window');

interface AuthSelectionScreenProps {
  onSignUpPress: () => void;
  onLoginPress: () => void;
  onGuestContinue: () => void;
  showBackButton?: boolean;
  onBackPress?: () => void;
}

const AuthSelectionScreen: React.FC<AuthSelectionScreenProps> = ({
  onSignUpPress,
  onLoginPress,
  onGuestContinue,
  showBackButton = false,
  onBackPress,
}) => {
  const router = useRouter();
  const { signIn } = useAuth();
  const [isQuickSigningIn, setIsQuickSigningIn] = useState(false);

  const handleQuickSignIn = async (profile: SavedProfile, password: string) => {
    setIsQuickSigningIn(true);
    try {
      console.log('🚀 Quick sign-in started for:', profile.email);
      await signIn(profile.email, password);
      console.log('✅ Quick sign-in successful - navigating to main app');

      // Navigate immediately to main app - don't wait for auth.tsx
      // AuthContext will catch up in the background
      router.replace('/(main)');
    } catch (error: any) {
      console.error('❌ Quick sign-in failed:', error.message);
      setIsQuickSigningIn(false);
      Alert.alert(
        'Quick Sign-In Failed',
        error.message || 'Unable to sign in with saved credentials. Please try again.',
        [{ text: 'OK' }]
      );
    }
    // Don't set isQuickSigningIn to false on success - let the navigation happen
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        {/* Full-screen loading overlay during quick sign-in */}
        {isQuickSigningIn && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContent}>
              <ActivityIndicator size="large" color={AuthColors.primaryButton} />
              <Text style={styles.loadingText}>Signing you in...</Text>
            </View>
          </View>
        )}

        {/* Header with optional back button */}
        {showBackButton && onBackPress && !isQuickSigningIn && (
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={onBackPress}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={24} color={AuthColors.primaryText} />
            </TouchableOpacity>
          </View>
        )}

        {/* Main Content - Hidden during quick sign-in */}
        <View style={[styles.content, isQuickSigningIn && styles.contentHidden]}>
          {/* Logo and Branding */}
          <View style={styles.logoContainer}>
            <LinearGradient
              colors={[AuthColors.primaryButton, AuthColors.primaryButtonHover]}
              style={styles.logoCircle}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.logoText}>V</Text>
            </LinearGradient>
            <Text style={styles.brandName}>VULU</Text>
          </View>

          {/* Quick Sign-In Tiles */}
          <QuickSignInTiles onProfileSelect={handleQuickSignIn} />

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Sign Up Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.primaryAction]}
              onPress={onSignUpPress}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[AuthColors.primaryButton, AuthColors.primaryButtonHover]}
                style={styles.actionButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <View style={styles.actionButtonContent}>
                  <Ionicons name="person-add" size={20} color="#FFFFFF" />
                  <View style={styles.actionTextContainer}>
                    <Text style={styles.actionTitle}>Sign Up</Text>
                    <Text style={styles.actionSubtitle}>Create a new account</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Log In Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryAction]}
              onPress={onLoginPress}
              activeOpacity={0.8}
            >
              <View style={styles.actionButtonContent}>
                <Ionicons name="log-in" size={20} color={AuthColors.primaryText} />
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionTitle, styles.secondaryActionTitle]}>Log In</Text>
                  <Text style={[styles.actionSubtitle, styles.secondaryActionSubtitle]}>
                    Sign into existing account
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={AuthColors.primaryText} />
              </View>
            </TouchableOpacity>

            {/* Continue as Guest Button */}
            <TouchableOpacity
              style={[styles.actionButton, styles.guestAction]}
              onPress={onGuestContinue}
              activeOpacity={0.8}
            >
              <View style={styles.actionButtonContent}>
                <Ionicons name="person-outline" size={20} color={AuthColors.secondaryText} />
                <View style={styles.actionTextContainer}>
                  <Text style={[styles.actionTitle, styles.guestActionTitle]}>Continue as Guest</Text>
                  <Text style={[styles.actionSubtitle, styles.guestActionSubtitle]}>
                    Limited features, no account needed
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={AuthColors.secondaryText} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our{' '}
              <Text style={styles.footerLink}>Terms of Service</Text>
              {' '}and{' '}
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </Text>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AuthColors.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 8,
    shadowColor: AuthColors.primaryButton,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  brandName: {
    fontSize: 24,
    fontWeight: '700',
    color: AuthColors.primaryText,
    letterSpacing: -0.5,
  },
  actionsContainer: {
    marginBottom: 32,
  },
  actionButton: {
    marginBottom: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
  primaryAction: {
    elevation: 4,
    shadowColor: AuthColors.primaryButton,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  secondaryAction: {
    backgroundColor: AuthColors.cardBackground,
    borderWidth: 1,
    borderColor: AuthColors.border,
  },
  guestAction: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: AuthColors.border,
  },
  actionButtonGradient: {
    height: 64,
    justifyContent: 'center',
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 64,
  },
  actionTextContainer: {
    flex: 1,
    marginLeft: 16,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  secondaryActionTitle: {
    color: AuthColors.primaryText,
  },
  guestActionTitle: {
    color: AuthColors.secondaryText,
  },
  actionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  secondaryActionSubtitle: {
    color: AuthColors.secondaryText,
  },
  guestActionSubtitle: {
    color: AuthColors.mutedText,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: AuthColors.mutedText,
    textAlign: 'center',
    lineHeight: 16,
  },
  footerLink: {
    color: AuthColors.linkColor,
    fontWeight: '500',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: AuthColors.background,
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: AuthColors.primaryText,
    marginTop: 16,
  },
  contentHidden: {
    opacity: 0,
  },
});

export default AuthSelectionScreen;
