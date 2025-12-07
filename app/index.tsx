import React, { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuthSafe } from '../src/context/AuthContext';
import BrandedLoadingScreen from '../src/components/BrandedLoadingScreen';

/**
 * App Entry Point - Single Source of Truth for Routing
 *
 * Flow:
 * 1. App starts → Firebase checks AsyncStorage for persisted session
 * 2. If session exists → Firebase restores it → onAuthStateChanged fires → user becomes truthy
 * 3. If user exists → navigate to /(main)
 * 4. If no session → authReady becomes true → navigate to /auth
 * 5. Manual login → Firebase persists session → user becomes truthy → navigate to /(main)
 *
 * Key: Firebase handles ALL session persistence via AsyncStorage
 * We just wait for onAuthStateChanged to fire and react to the user state
 */
function AuthenticationRouter() {
  const router = useRouter();
  const [hasNavigated, setHasNavigated] = useState(false);
  const authContext = useAuthSafe();

  const user = authContext?.user;
  const authReady = authContext?.authReady;
  const clearRegistrationFlag = authContext?.clearRegistrationFlag;

  useEffect(() => {
    if (!authContext || hasNavigated) return;

    // If user exists (Firebase restored session OR manual login), navigate to main app
    if (user) {
      console.log('✅ [index.tsx] User authenticated, navigating to main app');
      setHasNavigated(true);
      if (clearRegistrationFlag) clearRegistrationFlag();
      router.replace('/(main)');
      return;
    }

    // Wait for Firebase to check for persisted session
    if (!authReady) {
      console.log('⏳ [index.tsx] Waiting for Firebase session check...');
      return;
    }

    // Auth is ready and no user - Firebase found no persisted session
    // Show auth screen for manual login
    console.log('🔐 [index.tsx] No persisted session, showing auth screen');
    setHasNavigated(true);
    router.replace('/auth');
  }, [user, authReady, router, authContext, clearRegistrationFlag, hasNavigated]);

  const loadingMessage = user ? 'Launching...' : 'Loading...';
  return <BrandedLoadingScreen message={loadingMessage} />;
}

export default function Index() {
  return <AuthenticationRouter />;
}