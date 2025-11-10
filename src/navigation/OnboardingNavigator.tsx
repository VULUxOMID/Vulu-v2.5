import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthColors } from '../components/auth/AuthDesignSystem';

// Import new onboarding screens
import ContactMethodScreen from '../screens/onboarding/ContactMethodScreen';
import UsernameScreen from '../screens/onboarding/UsernameScreen';
import PasswordScreen from '../screens/onboarding/PasswordScreen';
import ProfileScreen from '../screens/onboarding/ProfileScreen';
import FinishScreen from '../screens/onboarding/FinishScreen';

// Define onboarding navigation params
export type OnboardingStackParamList = {
  ContactMethod: undefined;
  Username: undefined;
  Password: undefined;
  Profile: undefined;
  Finish: undefined;
};

const Stack = createStackNavigator<OnboardingStackParamList>();

// Onboarding step configuration
export const ONBOARDING_STEPS = [
  { key: 'ContactMethod', step: 1, title: 'Contact Method' },
  { key: 'Username', step: 2, title: 'Username' },
  { key: 'Password', step: 3, title: 'Password' },
  { key: 'Profile', step: 4, title: 'Profile' },
  { key: 'Finish', step: 5, title: 'Finish' },
] as const;

export const TOTAL_ONBOARDING_STEPS = ONBOARDING_STEPS.length;

// Helper function to get step info
export const getStepInfo = (routeName: keyof OnboardingStackParamList) => {
  return ONBOARDING_STEPS.find(step => step.key === routeName);
};

// Helper function to get next step
export const getNextStep = (currentStep: keyof OnboardingStackParamList): keyof OnboardingStackParamList | null => {
  const currentStepInfo = getStepInfo(currentStep);
  if (!currentStepInfo || currentStepInfo.step >= TOTAL_ONBOARDING_STEPS) {
    return null;
  }
  
  const nextStepInfo = ONBOARDING_STEPS.find(step => step.step === currentStepInfo.step + 1);
  return nextStepInfo ? nextStepInfo.key as keyof OnboardingStackParamList : null;
};

// Helper function to get previous step
export const getPreviousStep = (currentStep: keyof OnboardingStackParamList): keyof OnboardingStackParamList | null => {
  const currentStepInfo = getStepInfo(currentStep);
  if (!currentStepInfo || currentStepInfo.step <= 1) {
    return null;
  }
  
  const previousStepInfo = ONBOARDING_STEPS.find(step => step.step === currentStepInfo.step - 1);
  return previousStepInfo ? previousStepInfo.key as keyof OnboardingStackParamList : null;
};

const OnboardingNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="ContactMethod"
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        cardStyle: { backgroundColor: AuthColors.background },
        animationTypeForReplace: 'push',
        presentation: 'card',
      }}
    >
      <Stack.Screen
        name="ContactMethod"
        component={ContactMethodScreen}
        options={{
          gestureEnabled: false, // Disable back gesture on first screen
        }}
      />
      <Stack.Screen name="Username" component={UsernameScreen} />
      <Stack.Screen name="Password" component={PasswordScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen
        name="Finish"
        component={FinishScreen}
        options={{
          gestureEnabled: false, // Disable back gesture on final screen
        }}
      />
    </Stack.Navigator>
  );
};

export default OnboardingNavigator;
