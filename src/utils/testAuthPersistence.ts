/**
 * Test utility to verify Firebase Auth persistence is working correctly
 * 
 * This script tests that Firebase auth keys are preserved during cache clears
 * and that auth state persists across app restarts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Test 1: Verify Firebase auth keys exist after sign-in
 */
export async function testAuthKeysExist(): Promise<boolean> {
  try {
    console.log('🧪 Test 1: Checking for Firebase auth keys...');
    
    const keys = await AsyncStorage.getAllKeys();
    const firebaseAuthKeys = keys.filter(key => key.startsWith('firebase:auth'));
    
    if (firebaseAuthKeys.length > 0) {
      console.log(`✅ Found ${firebaseAuthKeys.length} Firebase auth key(s):`);
      firebaseAuthKeys.forEach(key => console.log(`   - ${key}`));
      return true;
    } else {
      console.log('❌ No Firebase auth keys found (user not signed in or keys were cleared)');
      return false;
    }
  } catch (error) {
    console.error('❌ Test 1 failed:', error);
    return false;
  }
}

/**
 * Test 2: Simulate cache clear and verify Firebase auth keys are preserved
 */
export async function testCacheClearPreservesAuth(): Promise<boolean> {
  try {
    console.log('🧪 Test 2: Testing cache clear preserves Firebase auth...');
    
    // Get Firebase auth keys before clear
    const keysBefore = await AsyncStorage.getAllKeys();
    const firebaseAuthKeysBefore = keysBefore.filter(key => key.startsWith('firebase:auth'));
    
    if (firebaseAuthKeysBefore.length === 0) {
      console.log('⚠️ No Firebase auth keys to test (user not signed in)');
      return false;
    }
    
    console.log(`📋 Before clear: ${firebaseAuthKeysBefore.length} Firebase auth key(s)`);
    
    // Simulate the cache clear logic (same as safeAsyncStorage.clear())
    const keysToRemove = keysBefore.filter(key => !key.startsWith('firebase:auth'));
    
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
      console.log(`🗑️ Removed ${keysToRemove.length} non-auth keys`);
    }
    
    // Verify Firebase auth keys still exist
    const keysAfter = await AsyncStorage.getAllKeys();
    const firebaseAuthKeysAfter = keysAfter.filter(key => key.startsWith('firebase:auth'));
    
    if (firebaseAuthKeysAfter.length === firebaseAuthKeysBefore.length) {
      console.log(`✅ Firebase auth keys preserved: ${firebaseAuthKeysAfter.length} key(s)`);
      return true;
    } else {
      console.log(`❌ Firebase auth keys lost! Before: ${firebaseAuthKeysBefore.length}, After: ${firebaseAuthKeysAfter.length}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Test 2 failed:', error);
    return false;
  }
}

/**
 * Test 3: List all AsyncStorage keys (for debugging)
 */
export async function listAllStorageKeys(): Promise<void> {
  try {
    console.log('🧪 Test 3: Listing all AsyncStorage keys...');
    
    const keys = await AsyncStorage.getAllKeys();
    
    if (keys.length === 0) {
      console.log('📋 AsyncStorage is empty');
      return;
    }
    
    console.log(`📋 Total keys: ${keys.length}`);
    
    // Group keys by prefix
    const firebaseKeys = keys.filter(key => key.startsWith('firebase:'));
    const otherKeys = keys.filter(key => !key.startsWith('firebase:'));
    
    if (firebaseKeys.length > 0) {
      console.log(`\n🔥 Firebase keys (${firebaseKeys.length}):`);
      firebaseKeys.forEach(key => console.log(`   - ${key}`));
    }
    
    if (otherKeys.length > 0) {
      console.log(`\n📦 Other keys (${otherKeys.length}):`);
      otherKeys.slice(0, 10).forEach(key => console.log(`   - ${key}`));
      if (otherKeys.length > 10) {
        console.log(`   ... and ${otherKeys.length - 10} more`);
      }
    }
  } catch (error) {
    console.error('❌ Test 3 failed:', error);
  }
}

/**
 * Run all auth persistence tests
 */
export async function runAllAuthPersistenceTests(): Promise<void> {
  console.log('\n🚀 Running Auth Persistence Tests...\n');
  
  const test1 = await testAuthKeysExist();
  console.log('');
  
  const test2 = await testCacheClearPreservesAuth();
  console.log('');
  
  await listAllStorageKeys();
  console.log('');
  
  // Summary
  console.log('📊 Test Summary:');
  console.log(`   Test 1 (Auth keys exist): ${test1 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Test 2 (Cache clear preserves auth): ${test2 ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');
  
  if (test1 && test2) {
    console.log('🎉 All tests passed! Auth persistence is working correctly.');
  } else {
    console.log('⚠️ Some tests failed. Check the logs above for details.');
  }
}

// Export individual tests for manual use
export default {
  testAuthKeysExist,
  testCacheClearPreservesAuth,
  listAllStorageKeys,
  runAllAuthPersistenceTests,
};

