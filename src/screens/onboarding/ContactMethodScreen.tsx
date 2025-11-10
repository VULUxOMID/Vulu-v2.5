import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { OnboardingFormCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { OnboardingInput } from '../../components/onboarding/OnboardingInputs';
import { AuthColors, AuthTypography } from '../../components/auth/AuthDesignSystem';
import { useOnboarding } from '../../context/OnboardingContext';
import { validateEmail, validatePhoneNumber } from '../../utils/onboardingValidation';

type ContactMethodScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'ContactMethod'>;

const ContactMethodScreen: React.FC = () => {
  const navigation = useNavigation<ContactMethodScreenNavigationProp>();
  const { onboardingData, updateOnboardingData, markStepCompleted, currentStep } = useOnboarding();
  
  const [email, setEmail] = useState(onboardingData.email || '');
  const [phoneNumber, setPhoneNumber] = useState(onboardingData.phoneNumber || '');
  const [emailError, setEmailError] = useState<string>('');
  const [phoneError, setPhoneError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleHelp = () => {
    Alert.alert(
      'Contact Method',
      'We need at least one way to contact you:\n\n• Email: For account recovery and important updates\n• Phone: For SMS verification and notifications\n\nYou can provide both if you prefer.',
      [{ text: 'OK' }]
    );
  };

  const handleContinue = () => {
    setLoading(true);
    setEmailError('');
    setPhoneError('');

    // At least one contact method is required
    if (!email.trim() && !phoneNumber.trim()) {
      setEmailError('Please provide at least one contact method');
      setPhoneError('Please provide at least one contact method');
      setLoading(false);
      return;
    }

    // Validate email if provided
    if (email.trim()) {
      const emailValidation = validateEmail(email);
      if (!emailValidation.isValid) {
        setEmailError(emailValidation.error || 'Invalid email');
        setLoading(false);
        return;
      }
    }

    // Validate phone if provided
    if (phoneNumber.trim()) {
      const phoneValidation = validatePhoneNumber(phoneNumber);
      if (!phoneValidation.isValid) {
        setPhoneError(phoneValidation.error || 'Invalid phone number');
        setLoading(false);
        return;
      }
    }

    // Save contact method and continue
    updateOnboardingData({ email, phoneNumber });
    markStepCompleted(1);
    
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('Username');
    }, 500);
  };

  const Title = () => (
    <Text style={styles.title}>How can we reach you?</Text>
  );

  const Subtitle = () => (
    <Text style={styles.subtitle}>
      Provide at least one contact method to continue
    </Text>
  );

  return (
    <View style={styles.container}>
      <OnboardingHeader
        onHelpPress={handleHelp}
        showBackButton={false}
        showHelpButton={true}
      />

      <OnboardingFormCard
        title={<Title />}
        subtitle={<Subtitle />}
      >
        <View style={styles.formContent}>
          <OnboardingInput
            label="Email Address (Optional)"
            value={email}
            onChangeText={(text) => { setEmail(text); setEmailError(''); }}
            placeholder="your.email@example.com"
            error={emailError}
            helperText="We'll use this for account recovery"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <OnboardingInput
            label="Phone Number (Optional)"
            value={phoneNumber}
            onChangeText={(text) => { setPhoneNumber(text); setPhoneError(''); }}
            placeholder="+1 (555) 123-4567"
            error={phoneError}
            helperText="We'll use this for SMS verification"
            keyboardType="phone-pad"
          />

          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>
              💡 You can provide both for better account security
            </Text>
          </View>
        </View>
      </OnboardingFormCard>

      <OnboardingFooter
        primaryButtonText={loading ? 'Continuing...' : 'Continue'}
        onPrimaryPress={handleContinue}
        primaryButtonDisabled={loading || (!email.trim() && !phoneNumber.trim())}
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
  title: {
    ...AuthTypography.onboardingTitle,
    marginBottom: 8,
  },
  subtitle: {
    ...AuthTypography.bodyText,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  formContent: {
    paddingTop: 16,
    gap: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: AuthColors.divider,
  },
  dividerText: {
    ...AuthTypography.microcopy,
    color: AuthColors.mutedText,
    marginHorizontal: 16,
    fontWeight: '600',
  },
  noteContainer: {
    padding: 16,
    backgroundColor: AuthColors.cardBackground,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AuthColors.divider,
  },
  noteText: {
    ...AuthTypography.microcopy,
    color: AuthColors.secondaryText,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default ContactMethodScreen;

