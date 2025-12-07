import React from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import AuthSelectionScreen from '../../src/screens/auth/AuthSelectionScreen';
import RegistrationNavigator from '../../src/navigation/RegistrationNavigator';
import { RegistrationProvider } from '../../src/context/RegistrationContext';
import LoginScreen from '../../src/components/auth/LoginScreen';
import { AuthColors } from '../../src/components/auth/AuthDesignSystem';

type AuthFlow = 'selection' | 'register' | 'login';

export default function AuthSelectionRoute() {
  const router = useRouter();
  const { signInAsGuest } = useAuth();
  const [currentFlow, setCurrentFlow] = React.useState<AuthFlow>('selection');

  const handleSignUpPress = () => {
    setCurrentFlow('register');
  };

  const handleLoginPress = () => {
    setCurrentFlow('login');
  };

  const handleGuestContinue = async () => {
    try {
      console.log('🎭 Guest continuing from auth selection');
      await signInAsGuest();
      console.log('✅ Guest login successful, navigating to main app');
      router.replace('/(main)');
    } catch (error: any) {
      console.error('❌ Guest login failed:', error);
      // Log full error details for debugging
      if (error?.message) {
        console.error('Error message:', error.message);
      }
      if (error?.stack) {
        console.error('Error stack:', error.stack);
      }
      // Show user-friendly error message
      Alert.alert(
        'Guest Mode Error',
        error?.message || 'Unable to continue as guest. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleBackToSelection = () => {
    setCurrentFlow('selection');
  };

  const handleBackToMain = () => {
    // When user cancels from auth selection, go back to main app
    router.replace('/(main)');
  };

  const renderCurrentFlow = () => {
    switch (currentFlow) {
      case 'selection':
        return (
          <AuthSelectionScreen
            onSignUpPress={handleSignUpPress}
            onLoginPress={handleLoginPress}
            onGuestContinue={handleGuestContinue}
            showBackButton={true}
            onBackPress={handleBackToMain}
          />
        );
      
      case 'register':
        return (
          <RegistrationProvider isGuestUpgrade={true}>
            <RegistrationNavigator onBackToLanding={handleBackToSelection} />
          </RegistrationProvider>
        );
      
      case 'login':
        return (
          <LoginScreen
            onSwitchToSignup={handleBackToSelection}
          />
        );
      
      default:
        return (
          <AuthSelectionScreen
            onSignUpPress={handleSignUpPress}
            onLoginPress={handleLoginPress}
            onGuestContinue={handleGuestContinue}
            showBackButton={true}
            onBackPress={handleBackToMain}
          />
        );
    }
  };

  return (
    <View style={styles.container}>
      {renderCurrentFlow()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
});
