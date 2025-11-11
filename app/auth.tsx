import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { useAuth } from '../src/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NewAuthScreen from '../src/screens/auth/NewAuthScreen';
import { OnboardingProvider } from '../src/context/OnboardingContext';
import BrandedLoadingScreen from '../src/components/BrandedLoadingScreen';

// Lazy load OnboardingNavigator to prevent AuthColors import issues during app startup
const OnboardingNavigator = lazy(() => import('../src/navigation/OnboardingNavigator'));

/**
 * CRITICAL: This component is a PURE UI component - it does NOT handle navigation
 * All navigation decisions are made by app/index.tsx (single source of truth)
 * This component only decides WHAT to render based on auth state
 */
export default function Auth() {
  const { user, loading, isGuest, justRegistered, userProfile } = useAuth();
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
        console.log('📋 [auth.tsx] Onboarding status:', completed === 'true' ? 'completed' : 'not completed');
      } catch (error) {
        console.warn('[auth.tsx] AsyncStorage error, defaulting to incomplete onboarding');
        setOnboardingCompleted(false);
      } finally {
        setCheckingOnboarding(false);
      }
    };

    checkOnboardingStatus();

    // Re-check when auth loading completes
    if (!loading && user) {
      console.log('🔄 [auth.tsx] Auth loaded, re-checking onboarding status');
      checkOnboardingStatus();
    }
  }, [loading, user]);

  // Show loading screen while checking authentication or onboarding
  if (loading || checkingOnboarding) {
    console.log('⏳ [auth.tsx] Loading or checking onboarding...');
    return <BrandedLoadingScreen message="Loading..." />;
  }

  // If user is authenticated but onboarding not complete, show onboarding screens
  if (user && !onboardingCompleted && !userProfile?.onboardingCompleted && !isGuest && !justRegistered) {
    console.log('📝 [auth.tsx] User needs onboarding, showing onboarding flow');
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
  console.log('🔐 [auth.tsx] No user, showing auth screen');
  return <NewAuthScreen />;
}