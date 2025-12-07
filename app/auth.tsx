import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NewAuthScreen from '../src/screens/auth/NewAuthScreen';
import { OnboardingProvider } from '../src/context/OnboardingContext';

// Lazy load OnboardingNavigator to prevent AuthColors import issues during app startup
const OnboardingNavigator = lazy(() => import('../src/navigation/OnboardingNavigator'));

/**
 * Auth Screen Component
 *
 * Responsibilities:
 * - Shows login/signup screen for unauthenticated users
 * - Shows onboarding for authenticated users who haven't completed it
 * - Navigates to /(main) when user signs in on THIS screen (app/index.tsx is unmounted at this point)
 *
 * Note: app/index.tsx handles navigation for Firebase session restoration on cold start
 * This component handles navigation for manual sign-in that happens while on /auth
 */
export default function Auth() {
  const router = useRouter();
  const { user, isGuest, justRegistered, userProfile } = useAuth();
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Check onboarding completion status (optimized for speed)
  useEffect(() => {
    let mounted = true;
    
    const checkOnboardingStatus = async () => {
      try {
        // Use getItem with fast path - don't wait if user already exists
        if (user && user.email) {
          // Existing logged-in user - skip AsyncStorage check and assume completed
          if (mounted) {
            setOnboardingCompleted(true);
            setCheckingOnboarding(false);
          }
          return;
        }
        
        const completed = await AsyncStorage.getItem('@onboarding_completed');
        if (mounted) {
          setOnboardingCompleted(completed === 'true');
        }
      } catch (error) {
        console.warn('[auth.tsx] AsyncStorage error, defaulting to incomplete onboarding');
        if (mounted) {
          setOnboardingCompleted(false);
        }
      } finally {
        if (mounted) {
          setCheckingOnboarding(false);
        }
      }
    };

    checkOnboardingStatus();
    
    return () => {
      mounted = false;
    };
  }, [user]);

  // Navigate to main app when user signs in on this screen
  // This is necessary because app/index.tsx is unmounted when we're on /auth
  useEffect(() => {
    if (!user || checkingOnboarding) return;

    // Skip onboarding if ANY of these conditions are true:
    // 1. User is a guest
    // 2. User just registered (will go through onboarding flow)
    // 3. AsyncStorage flag says onboarding is complete
    // 4. Firestore profile says onboarding is complete
    // 5. Profile has username and displayName (legacy accounts without onboardingCompleted flag)
    // 6. User has an email (existing logged-in user, not new registration)
    const hasCompletedOnboarding = onboardingCompleted || userProfile?.onboardingCompleted;
    const hasCompleteProfile = userProfile?.username && userProfile?.displayName;
    const isExistingUser = user.email && !justRegistered; // Has email and didn't just register
    const shouldSkipOnboarding = isGuest || justRegistered || hasCompletedOnboarding || hasCompleteProfile || isExistingUser;

    if (shouldSkipOnboarding) {
      console.log('✅ [auth.tsx] User signed in, navigating to main app', {
        isGuest,
        justRegistered,
        onboardingCompleted,
        firestoreOnboardingCompleted: userProfile?.onboardingCompleted,
        hasCompleteProfile,
        isExistingUser,
        userEmail: user.email
      });
      // Use replace to prevent going back to auth screen
      router.replace('/(main)');
      return;
    } else {
      console.log('⏳ [auth.tsx] User needs onboarding', {
        onboardingCompleted,
        firestoreOnboardingCompleted: userProfile?.onboardingCompleted,
        hasUsername: !!userProfile?.username,
        hasDisplayName: !!userProfile?.displayName,
        userEmail: user.email,
        justRegistered
      });
    }
  }, [user, checkingOnboarding, onboardingCompleted, userProfile?.onboardingCompleted, userProfile?.username, userProfile?.displayName, isGuest, justRegistered, router]);

  // If user is authenticated but onboarding not complete, show onboarding screens
  // Only show onboarding if ALL of these are true:
  // 1. User is authenticated
  // 2. Not checking onboarding status
  // 3. AsyncStorage flag is NOT set
  // 4. Firestore profile does NOT have onboardingCompleted flag
  // 5. Profile does NOT have username and displayName (incomplete profile)
  // 6. Not a guest user
  // 7. Not just registered
  // 8. User doesn't have email (new user, not existing logged-in user)
  const hasCompletedOnboarding = onboardingCompleted || userProfile?.onboardingCompleted;
  const hasCompleteProfile = userProfile?.username && userProfile?.displayName;
  const isExistingUser = user?.email && !justRegistered;
  const shouldShowOnboarding = user && !checkingOnboarding && !hasCompletedOnboarding && !hasCompleteProfile && !isGuest && !justRegistered && !isExistingUser;

  if (shouldShowOnboarding) {
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

  // Show authentication screen for non-authenticated users
  return <NewAuthScreen />;
}