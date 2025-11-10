import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator, Text } from 'react-native';
import { useAuthSafe } from '../src/context/AuthContext';

// CRITICAL FIX: Authentication-first routing component
function AuthenticationRouter() {
  const router = useRouter();

  // Safely get auth context - returns null if provider not ready
  const authContext = useAuthSafe();

  // Extract user, loading, and authReady from context if available
  const user = authContext?.user;
  const loading = authContext?.loading;
  const authReady = authContext?.authReady;
  const clearRegistrationFlag = authContext?.clearRegistrationFlag;

  useEffect(() => {
    // CRITICAL: Don't navigate if auth context is not available
    if (!authContext) {
      console.log('⏳ Auth context not available yet...');
      return;
    }

    // CRITICAL: Don't navigate until authReady is true
    // This ensures Firebase auth state has been determined AND auto-login has completed
    if (!authReady) {
      console.log('⏳ Waiting for auth to be ready...', { loading, authReady });
      return;
    }

    // Only proceed when authReady is true
    console.log('🔍 Authentication ready, making routing decision:', {
      hasUser: !!user,
      userType: user ? (user.isGuest ? 'guest' : 'authenticated') : 'none',
      loading,
      authReady
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
  }, [user, loading, authReady, router, authContext, clearRegistrationFlag]);

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
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#131318' }}>
      <ActivityIndicator size="large" color="#6E69F4" />
      <Text style={{ color: '#FFFFFF', marginTop: 16, fontSize: 16 }}>
        {!authReady ? 'Checking authentication...' : 'Loading VuluGO...'}
      </Text>
    </View>
  );
}

export default function Index() {
  return <AuthenticationRouter />;
}