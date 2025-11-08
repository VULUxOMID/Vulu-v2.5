import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NewAuthScreen from '../src/screens/auth/NewAuthScreen';
import { OnboardingProvider } from '../src/context/OnboardingContext';

// Lazy load OnboardingNavigator to prevent AuthColors import issues during app startup
const OnboardingNavigator = lazy(() => import('../src/navigation/OnboardingNavigator'));

export default function Auth() {
  const { user, loading, isGuest, justRegistered, clearRegistrationFlag, userProfile } = useAuth();
  const router = useRouter();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Memoize the profile completeness check to prevent unnecessary re-renders
  const hasCompleteProfile = useMemo(() => {
    return !!(
      (user?.email || userProfile?.email) &&
      userProfile?.username &&
      (user?.displayName || userProfile?.displayName || userProfile?.name || userProfile?.fullName)
    ) || !!userProfile?.onboardingCompleted;
  }, [user?.email, user?.displayName, userProfile?.email, userProfile?.username, userProfile?.displayName, userProfile?.name, userProfile?.fullName, userProfile?.onboardingCompleted]);

  // Check onboarding completion status
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const completed = await AsyncStorage.getItem('@onboarding_completed');
        setOnboardingCompleted(completed === 'true');
      } catch (error) {
        // Handle AsyncStorage errors gracefully in development environment
        console.warn('AsyncStorage unavailable in development environment, defaulting to incomplete onboarding');
        // Default to false (onboarding not completed) so the flow continues normally
        setOnboardingCompleted(false);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  // Redirect authenticated users
  useEffect(() => {
    if (loading || checkingOnboarding) return;

    if (!user) return;

    // CRITICAL FIX: Handle guest users differently - they don't need onboarding
    if (isGuest) {
      console.log('🎭 Guest user in auth screen, redirecting to main app');
      router.replace('/(main)');
      return;
    }

    // CRITICAL FIX: Skip onboarding for newly registered users
    if (justRegistered) {
      console.log('✅ User just registered, skipping onboarding and going to main app');
      clearRegistrationFlag();
      router.replace('/(main)');
      return;
    }

    // Check if onboarding is explicitly completed (from Firestore or AsyncStorage)
    const completed =
      Boolean(userProfile?.onboardingCompleted) || onboardingCompleted === true;

    if (completed) {
      console.log('✅ Onboarding completed, redirecting to main app');
      router.replace('/(main)');
      return;
    }

    // Else: stay in onboarding; no redirect
    console.log('ℹ️ Onboarding not completed, showing onboarding screens');
  }, [user, userProfile, loading, checkingOnboarding, onboardingCompleted, isGuest, justRegistered, router, clearRegistrationFlag]);

  // Early return: If user is authenticated and onboarding is complete, redirect immediately
  // This prevents any UI flash
  if (!loading && !checkingOnboarding && user) {
    const completed =
      Boolean(userProfile?.onboardingCompleted) || onboardingCompleted === true;

    if ((isGuest || justRegistered || completed) && !loading) {
      // Don't render anything - the useEffect will handle the redirect
      return null;
    }
  }

  // Show loading screen while checking authentication or onboarding
  if (loading || checkingOnboarding) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1117' }}>
        <ActivityIndicator size="large" color="#5865F2" />
      </View>
    );
  }

  // If user is authenticated but onboarding not complete, show onboarding screens
  if (user && !onboardingCompleted && !userProfile?.onboardingCompleted) {
    return (
      <OnboardingProvider>
        <Suspense fallback={
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1117' }}>
            <ActivityIndicator size="large" color="#5865F2" />
          </View>
        }>
          <OnboardingNavigator />
        </Suspense>
      </OnboardingProvider>
    );
  }

  // Show new authentication screen for non-authenticated users
  return <NewAuthScreen />;
}