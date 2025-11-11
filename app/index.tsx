import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthSafe } from '../src/context/AuthContext';
import BrandedLoadingScreen from '../src/components/BrandedLoadingScreen';

// CRITICAL: Single source of truth for all app routing
// This component decides whether to show /(main) or /auth based on auth state
// No other component should perform navigation - this prevents flashes and race conditions
function AuthenticationRouter() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  // Safely get auth context - returns null if provider not ready
  const authContext = useAuthSafe();

  // Extract user, loading, authReady, and session flags from context if available
  const user = authContext?.user;
  const loading = authContext?.loading;
  const authReady = authContext?.authReady;
  const hasLocalSession = authContext?.hasLocalSession;
  const sessionVerified = authContext?.sessionVerified;
  const clearRegistrationFlag = authContext?.clearRegistrationFlag;

  useEffect(() => {
    // CRITICAL: Don't navigate if auth context is not available
    if (!authContext) {
      console.log('⏳ [index.tsx] Auth context not available yet...');
      return;
    }

    // Don't navigate if already navigating
    if (isNavigating) {
      return;
    }

    // Log current state for debugging
    console.log('📊 [index.tsx] Routing state:', {
      hasLocalSession,
      hasUser: !!user,
      sessionVerified,
      authReady,
      loading
    });

    // DISCORD-STYLE INSTANT LAUNCH: If we have a local session, navigate immediately
    // Don't wait for authReady - show the app instantly while verification happens in background
    if (hasLocalSession && user) {
      console.log('🚀 [index.tsx] INSTANT LAUNCH: Local session found, navigating to main app NOW!');
      setIsNavigating(true);
      if (clearRegistrationFlag) clearRegistrationFlag();
      router.replace('/(main)');
      return;
    }

    // If session verification failed, redirect to auth
    if (hasLocalSession && sessionVerified === false && !user) {
      console.log('❌ [index.tsx] Session verification failed, redirecting to auth');
      setIsNavigating(true);
      router.replace('/auth');
      return;
    }

    // CRITICAL: Don't navigate until authReady is true (for non-instant-launch cases)
    // This ensures Firebase auth state has been determined AND auto-login has completed
    if (!authReady) {
      console.log('⏳ [index.tsx] Waiting for auth to be ready...', { loading, authReady, hasLocalSession });
      return;
    }

    // Only proceed when authReady is true
    console.log('🔍 [index.tsx] Authentication ready, making routing decision:', {
      hasUser: !!user,
      loading,
      authReady
    });

    if (user) {
      // User is authenticated - go to main app immediately
      console.log('✅ [index.tsx] User authenticated, navigating to main app');
      setIsNavigating(true);
      if (clearRegistrationFlag) clearRegistrationFlag();
      router.replace('/(main)');
    } else {
      // No user - show authentication selection screen
      console.log('🚫 [index.tsx] No user found, showing authentication selection');
      setIsNavigating(true);
      router.replace('/auth');
    }
  }, [user, loading, authReady, hasLocalSession, sessionVerified, router, authContext, clearRegistrationFlag, isNavigating]);

  // Show beautiful branded loading screen while determining authentication state
  // This replaces the login screen flash with a professional loading experience
  const loadingMessage = hasLocalSession
    ? 'Launching...'
    : 'Loading...';

  return <BrandedLoadingScreen message={loadingMessage} />;
}

export default function Index() {
  return <AuthenticationRouter />;
}