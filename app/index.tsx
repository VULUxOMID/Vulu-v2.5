import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthSafe } from '../src/context/AuthContext';
import BrandedLoadingScreen from '../src/components/BrandedLoadingScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';

// CRITICAL: Single source of truth for all app routing
// This component decides whether to show /(main) or /auth based on auth state
// No other component should perform navigation - this prevents flashes and race conditions
function AuthenticationRouter() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  // Safely get auth context - returns null if provider not ready
  const authContext = useAuthSafe();

  // Extract user, loading, authReady, and session flags from context if available
  const user = authContext?.user;
  const loading = authContext?.loading;
  const authReady = authContext?.authReady;
  const hasLocalSession = authContext?.hasLocalSession;
  const sessionVerified = authContext?.sessionVerified;
  const clearRegistrationFlag = authContext?.clearRegistrationFlag;
  const isGuest = authContext?.isGuest;
  const justRegistered = authContext?.justRegistered;
  const userProfile = authContext?.userProfile;

  // Check onboarding status from AsyncStorage
  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const completed = await AsyncStorage.getItem('@onboarding_completed');
        setOnboardingCompleted(completed === 'true');
      } catch (error) {
        console.warn('Failed to check onboarding status:', error);
        setOnboardingCompleted(false);
      }
    };
    checkOnboarding();
  }, [user]); // Re-check when user changes

  useEffect(() => {
    // CRITICAL: Don't navigate if auth context is not available
    if (!authContext) {
      console.log('⏳ Auth context not available yet...');
      return;
    }

    // Don't navigate if already navigating
    if (isNavigating) {
      return;
    }

    // Wait for onboarding check to complete
    if (onboardingCompleted === null) {
      console.log('⏳ Waiting for onboarding check...');
      return;
    }

    // Log current state for debugging
    console.log('📊 Routing state:', {
      hasLocalSession,
      hasUser: !!user,
      sessionVerified,
      authReady,
      loading,
      isGuest,
      justRegistered,
      onboardingCompleted
    });

    // DISCORD-STYLE INSTANT LAUNCH: If we have a local session, navigate immediately
    // Don't wait for authReady - show the app instantly while verification happens in background
    if (hasLocalSession && user) {
      console.log('🚀 INSTANT LAUNCH: Local session found, navigating to main app NOW!', {
        sessionVerified,
        hasUser: !!user,
        timestamp: Date.now()
      });

      setIsNavigating(true);

      // Clear registration flag when user reaches main app
      if (clearRegistrationFlag) {
        clearRegistrationFlag();
      }

      // Small delay for smooth transition (100ms - barely noticeable)
      setTimeout(() => {
        router.replace('/(main)');
      }, 100);
      return;
    }

    // If session verification failed, redirect to auth
    if (hasLocalSession && sessionVerified === false && !user) {
      console.log('❌ Session verification failed, redirecting to auth');
      setIsNavigating(true);
      setTimeout(() => {
        router.replace('/auth');
      }, 100);
      return;
    }

    // CRITICAL: Don't navigate until authReady is true (for non-instant-launch cases)
    // This ensures Firebase auth state has been determined AND auto-login has completed
    if (!authReady) {
      console.log('⏳ Waiting for auth to be ready...', { loading, authReady, hasLocalSession });
      return;
    }

    // Only proceed when authReady is true
    console.log('🔍 Authentication ready, making routing decision:', {
      hasUser: !!user,
      userType: user ? (user.isGuest ? 'guest' : 'authenticated') : 'none',
      loading,
      authReady,
      hasLocalSession,
      sessionVerified,
      isGuest,
      justRegistered,
      onboardingCompleted
    });

    if (user) {
      // CRITICAL: Check if user needs onboarding
      // Guest users, newly registered users, and users who completed onboarding go to main app
      // Others need to complete onboarding first
      const needsOnboarding = !isGuest && !justRegistered && !onboardingCompleted && !userProfile?.onboardingCompleted;

      if (needsOnboarding) {
        console.log('📝 User needs onboarding, navigating to /auth for onboarding flow');
        setIsNavigating(true);
        setTimeout(() => {
          router.replace('/auth');
        }, 100);
      } else {
        console.log('✅ User authenticated and ready, navigating to main app');
        setIsNavigating(true);

        // Clear registration flag when user reaches main app
        if (clearRegistrationFlag) {
          clearRegistrationFlag();
        }

        // Small delay for smooth transition
        setTimeout(() => {
          router.replace('/(main)');
        }, 100);
      }
    } else {
      // No user - show authentication selection screen
      console.log('🚫 No user found, showing authentication selection');
      setIsNavigating(true);
      setTimeout(() => {
        router.replace('/auth');
      }, 100);
    }
  }, [user, loading, authReady, hasLocalSession, sessionVerified, router, authContext, clearRegistrationFlag, isNavigating, isGuest, justRegistered, onboardingCompleted, userProfile]);

  // If auth context is not available, show branded loading screen
  if (!authContext) {
    return <BrandedLoadingScreen message="Initializing..." />;
  }

  // Show beautiful branded loading screen while determining authentication state
  // This replaces the login screen flash with a professional loading experience
  // Optimized to show for minimal time (<500ms) while auth state is determined
  const loadingMessage = hasLocalSession
    ? 'Launching...'
    : (!authReady ? 'Loading...' : 'Preparing your experience...');

  return <BrandedLoadingScreen message={loadingMessage} />;
}

export default function Index() {
  return <AuthenticationRouter />;
}