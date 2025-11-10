import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { OnboardingStackParamList } from '../../navigation/OnboardingNavigator';
import { OnboardingFormCard } from '../../components/onboarding/OnboardingCard';
import { OnboardingHeader } from '../../components/onboarding/OnboardingHeader';
import { OnboardingFooter } from '../../components/onboarding/OnboardingFooter';
import { OnboardingInput } from '../../components/onboarding/OnboardingInputs';
import { AuthColors, AuthTypography } from '../../components/auth/AuthDesignSystem';
import { useOnboarding } from '../../context/OnboardingContext';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

type ProfileScreenNavigationProp = StackNavigationProp<OnboardingStackParamList, 'Profile'>;

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<ProfileScreenNavigationProp>();
  const { onboardingData, updateOnboardingData, markStepCompleted, currentStep } = useOnboarding();
  
  const [displayName, setDisplayName] = useState(onboardingData.displayName || onboardingData.username || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(onboardingData.avatarUri || null);
  const [loading, setLoading] = useState(false);

  const handleHelp = () => {
    Alert.alert(
      'Profile Setup',
      'Customize your profile:\n\n• Display Name: How others will see you (defaults to your username)\n• Avatar: A profile picture (optional)\n\nYou can skip this step and set it up later.',
      [{ text: 'OK' }]
    );
  };

  const handleBack = () => {
    navigation.goBack();
  };

  const pickImage = async () => {
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'We need permission to access your photos to set a profile picture.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Launch image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const removeAvatar = () => {
    Alert.alert(
      'Remove Avatar',
      'Are you sure you want to remove your profile picture?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => setAvatarUri(null) },
      ]
    );
  };

  const handleContinue = () => {
    setLoading(true);

    // Use username as display name if not provided
    const finalDisplayName = displayName.trim() || onboardingData.username;

    updateOnboardingData({ 
      displayName: finalDisplayName,
      avatarUri: avatarUri,
    });
    markStepCompleted(4);
    
    setTimeout(() => {
      setLoading(false);
      navigation.navigate('Finish');
    }, 500);
  };

  const handleSkip = () => {
    // Use username as display name
    updateOnboardingData({ 
      displayName: onboardingData.username,
      avatarUri: null,
    });
    markStepCompleted(4);
    navigation.navigate('Finish');
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader
        onBackPress={handleBack}
        onHelpPress={handleHelp}
        showBackButton={true}
        showHelpButton={true}
      />

      <OnboardingFormCard
        title={<Text style={styles.title}>Set up your profile</Text>}
        subtitle={<Text style={styles.subtitle}>Personalize your account (optional)</Text>}
      >
        <View style={styles.formContent}>
          {/* Avatar Picker */}
          <View style={styles.avatarSection}>
            <Text style={styles.avatarLabel}>Profile Picture</Text>
            <TouchableOpacity 
              style={styles.avatarContainer}
              onPress={pickImage}
              activeOpacity={0.7}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="person" size={48} color={AuthColors.mutedText} />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={16} color={AuthColors.primaryText} />
              </View>
            </TouchableOpacity>
            
            {avatarUri && (
              <TouchableOpacity onPress={removeAvatar} style={styles.removeButton}>
                <Text style={styles.removeButtonText}>Remove Photo</Text>
              </TouchableOpacity>
            )}
            
            {!avatarUri && (
              <Text style={styles.avatarHelperText}>Tap to upload a photo</Text>
            )}
          </View>

          {/* Display Name Input */}
          <OnboardingInput
            label="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={onboardingData.username}
            helperText="How others will see you (defaults to username)"
            maxLength={30}
          />
        </View>
      </OnboardingFormCard>

      <OnboardingFooter
        primaryButtonText={loading ? 'Saving...' : 'Continue'}
        onPrimaryPress={handleContinue}
        primaryButtonDisabled={loading}
        primaryButtonLoading={loading}
        secondaryButtonText="Skip for now"
        onSecondaryPress={handleSkip}
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
    paddingTop: 24,
    gap: 32,
  },
  avatarSection: {
    alignItems: 'center',
    gap: 12,
  },
  avatarLabel: {
    ...AuthTypography.label,
    color: AuthColors.primaryText,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  avatarContainer: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: AuthColors.primaryButton,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: AuthColors.cardBackground,
    borderWidth: 2,
    borderColor: AuthColors.divider,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: AuthColors.primaryButton,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: AuthColors.background,
  },
  avatarHelperText: {
    ...AuthTypography.microcopy,
    color: AuthColors.mutedText,
  },
  removeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  removeButtonText: {
    ...AuthTypography.microcopy,
    color: AuthColors.error,
    fontWeight: '600',
  },
});

export default ProfileScreen;

