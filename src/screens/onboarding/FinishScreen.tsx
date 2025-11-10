import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { OnboardingCenteredCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { AuthColors, AuthTypography } from '../../components/auth/AuthDesignSystem';
import { useOnboarding } from '../../context/OnboardingContext';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

type FinishScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Finish'>;

const FinishScreen: React.FC = () => {
  const navigation = useNavigation<FinishScreenNavigationProp>();
  const { onboardingData, markStepCompleted, completeOnboarding, currentStep } = useOnboarding();
  
  const [loading, setLoading] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Mark final step as completed
    markStepCompleted(5);

    // Animate success icon
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGetStarted = async () => {
    setLoading(true);
    
    // Complete onboarding and navigate to main app
    await completeOnboarding();
    
    // TODO: Navigate to main app
    // For now, we'll just log the completion
    console.log('Onboarding completed!', onboardingData);
    
    // In a real app, you would navigate to the main app here:
    // navigation.reset({
    //   index: 0,
    //   routes: [{ name: 'MainApp' }],
    // });
    
    setTimeout(() => {
      setLoading(false);
      // Placeholder: In production, this would navigate to the main app
      alert('Onboarding complete! Welcome to VuluGO 🎉');
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <OnboardingCenteredCard>
        <View style={styles.content}>
          {/* Success Icon */}
          <Animated.View 
            style={[
              styles.iconContainer,
              { transform: [{ scale: scaleAnim }] }
            ]}
          >
            <LinearGradient
              colors={[AuthColors.primaryButton, AuthColors.accentPurple]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconGradient}
            >
              <Ionicons name="checkmark-circle" size={80} color={AuthColors.primaryText} />
            </LinearGradient>
          </Animated.View>

          {/* Success Message */}
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={styles.title}>You're all set!</Text>
            <Text style={styles.subtitle}>
              Welcome to VuluGO, {onboardingData.displayName || onboardingData.username}
            </Text>

            {/* Account Summary */}
            <View style={styles.summaryContainer}>
              <View style={styles.summaryItem}>
                <Ionicons name="person-outline" size={20} color={AuthColors.mutedText} />
                <Text style={styles.summaryText}>@{onboardingData.username}</Text>
              </View>
              
              {onboardingData.email && (
                <View style={styles.summaryItem}>
                  <Ionicons name="mail-outline" size={20} color={AuthColors.mutedText} />
                  <Text style={styles.summaryText}>{onboardingData.email}</Text>
                </View>
              )}
              
              {onboardingData.phoneNumber && (
                <View style={styles.summaryItem}>
                  <Ionicons name="call-outline" size={20} color={AuthColors.mutedText} />
                  <Text style={styles.summaryText}>{onboardingData.phoneNumber}</Text>
                </View>
              )}
            </View>

            <Text style={styles.description}>
              Your account has been created successfully. Let's explore what VuluGO has to offer!
            </Text>
          </Animated.View>
        </View>
      </OnboardingCenteredCard>

      <OnboardingFooter
        primaryButtonText={loading ? 'Loading...' : 'Get Started'}
        onPrimaryPress={handleGetStarted}
        primaryButtonDisabled={loading}
        primaryButtonLoading={loading}
        currentStep={currentStep}
        totalSteps={5}
        showStepDots={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AuthColors.background,
  },
  content: {
    alignItems: 'center',
    gap: 24,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...AuthTypography.onboardingTitle,
    fontSize: 32,
    textAlign: 'center',
  },
  subtitle: {
    ...AuthTypography.bodyText,
    fontSize: 18,
    textAlign: 'center',
    color: AuthColors.secondaryText,
    marginTop: -8,
  },
  summaryContainer: {
    width: '100%',
    backgroundColor: AuthColors.cardBackground,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: AuthColors.divider,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryText: {
    ...AuthTypography.bodyText,
    color: AuthColors.primaryText,
    flex: 1,
  },
  description: {
    ...AuthTypography.bodyText,
    textAlign: 'center',
    color: AuthColors.mutedText,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
});

export default FinishScreen;

