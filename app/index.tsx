import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuthSafe } from '../src/context/AuthContext';

// CRITICAL FIX: Authentication-first routing component
function AuthenticationRouter() {
  const router = useRouter();

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
      console.log('⏳ Auth context not available yet...');
      return;
    }

    // Log current state for debugging
    console.log('📊 Routing state:', {
      hasLocalSession,
      hasUser: !!user,
      sessionVerified,
      authReady,
      loading
    });

    // DISCORD-STYLE INSTANT LAUNCH: If we have a local session, navigate immediately
    // Don't wait for authReady - show the app instantly while verification happens in background
    if (hasLocalSession && user) {
      console.log('🚀 INSTANT LAUNCH: Local session found, navigating to main app NOW!', {
        sessionVerified,
        hasUser: !!user,
        timestamp: Date.now()
      });

      // Clear registration flag when user reaches main app
      if (clearRegistrationFlag) {
        clearRegistrationFlag();
      }

      router.replace('/(main)');
      return;
    }

    // If session verification failed, redirect to auth
    if (hasLocalSession && sessionVerified === false && !user) {
      console.log('❌ Session verification failed, redirecting to auth');
      router.replace('/auth');
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
      sessionVerified
    });

    if (user) {
      // User is authenticated (either regular user or guest) - go to main app
      console.log('✅ User authenticated, navigating to main app');

      // Clear registration flag when user reaches main app
      if (clearRegistrationFlag) {
        clearRegistrationFlag();
      }

      router.replace('/(main)');
    } else {
      // No user - show authentication selection screen
      console.log('🚫 No user found, showing authentication selection');
      router.replace('/auth');
    }
  }, [user, loading, authReady, hasLocalSession, sessionVerified, router, authContext, clearRegistrationFlag]);

  // If auth context is not available, show loading
  if (!authContext) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#131318' }}>
        <ActivityIndicator size="large" color="#6E69F4" />
        <Text style={{ color: '#FFFFFF', marginTop: 16, fontSize: 16 }}>
          Loading authentication system...
        </Text>
      </View>
    );
  }

  // Show loading screen while determining authentication state
  // Note: This screen should rarely be seen with instant launch enabled
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#131318' }}>
      <ActivityIndicator size="large" color="#6E69F4" />
      <Text style={{ color: '#FFFFFF', marginTop: 16, fontSize: 16 }}>
        {hasLocalSession ? 'Launching...' : (!authReady ? 'Checking authentication...' : 'Loading VuluGO...')}
      </Text>
    </View>
  );
}

export default function Index() {
  return <AuthenticationRouter />;
}