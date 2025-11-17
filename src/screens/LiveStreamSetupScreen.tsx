import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  Switch,
  Modal,
  FlatList,
  Dimensions,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { PURPLE } from '../constants/colors';
import { useAuth } from '../context/AuthContext';
import { useLiveStreams } from '../context/LiveStreamContext';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Conditional import for camera - only available in development builds
let Camera: any = null;
try {
  Camera = require('expo-camera');
} catch (error) {
  console.log('📱 Camera module not available in Expo Go environment');
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Storage keys for tracking permission requests (one-time only)
const MIC_PERMISSION_REQUESTED_KEY = '@vulu_mic_permission_requested';
const CAMERA_PERMISSION_REQUESTED_KEY = '@vulu_camera_permission_requested';

interface LiveTag {
  id: string;
  label: string;
  color: string;
}

const LIVE_TAGS: LiveTag[] = [
  { id: 'choose', label: 'CHOOSE', color: '#FFD700' },
  { id: 'lets-talk', label: "LET'S TALK", color: '#FF6B6B' },
  { id: 'gaming', label: 'GAMING', color: '#4ECDC4' },
  { id: 'music', label: 'MUSIC', color: '#45B7D1' },
  { id: 'just-chatting', label: 'JUST CHATTING', color: '#96CEB4' },
  { id: 'creative', label: 'CREATIVE', color: '#FFEAA7' },
  { id: 'fitness', label: 'FITNESS', color: '#DDA0DD' },
  { id: 'cooking', label: 'COOKING', color: '#98D8C8' },
];

const LiveStreamSetupScreen: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { createNewStream } = useLiveStreams();

  // Environment detection
  const isExpoGo = Constants.appOwnership === 'expo';
  const isDevelopmentBuild = Constants.appOwnership === 'standalone' || !isExpoGo;
  const isCameraAvailable = Camera && Camera.requestCameraPermissionsAsync;

  // State management
  const [streamTitle, setStreamTitle] = useState('');
  const [selectedTag, setSelectedTag] = useState<LiveTag>(LIVE_TAGS[0]);
  const [showTagModal, setShowTagModal] = useState(false);
  const [cameraEnabled, setCameraEnabled] = useState(false); // Disabled by default (audio-only)
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true); // Enabled by default
  const [isCreatingStream, setIsCreatingStream] = useState(false);
  const [showPermissionWarning, setShowPermissionWarning] = useState(false);
  
  // Permission tracking state
  const [micPermissionRequested, setMicPermissionRequested] = useState(false);
  const [cameraPermissionRequested, setCameraPermissionRequested] = useState(false);
  const [micPermissionStatus, setMicPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  // Load permission request history and check current status on mount
  useEffect(() => {
    const initializePermissions = async () => {
      await loadPermissionHistory();
      await checkCurrentPermissions();
    };
    
    initializePermissions();
  }, []); // Only run once on mount

  // Request microphone permission automatically when screen is ready
  // This ensures iOS system dialog shows as soon as user enters the screen
  useEffect(() => {
    if (isExpoGo || !isCameraAvailable) {
      return;
    }

    // Request permission immediately when screen loads (microphone is enabled by default)
    // This will show iOS system dialog if permission status is 'undetermined'
    const requestPermission = async () => {
      // Small delay to ensure UI is rendered
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('🔄 Auto-requesting microphone permission on screen load...');
      await requestMicrophonePermissionIfNeeded();
    };

    requestPermission();
  }, []); // Only run once on mount

  // Load permission request history from AsyncStorage
  const loadPermissionHistory = async () => {
    try {
      const micRequested = await AsyncStorage.getItem(MIC_PERMISSION_REQUESTED_KEY);
      const cameraRequested = await AsyncStorage.getItem(CAMERA_PERMISSION_REQUESTED_KEY);
      
      setMicPermissionRequested(micRequested === 'true');
      setCameraPermissionRequested(cameraRequested === 'true');
      
      console.log('📋 Permission history loaded:', {
        micRequested: micRequested === 'true',
        cameraRequested: cameraRequested === 'true'
      });
    } catch (error) {
      console.error('Error loading permission history:', error);
    }
  };

  // Check current permission status (without requesting)
  const checkCurrentPermissions = async () => {
    try {
      if (isExpoGo) {
        // In Expo Go, we can't check real permissions
        setShowPermissionWarning(true);
        return;
      }

      // Check microphone permission status (using Camera API for iOS compatibility)
      if (isCameraAvailable) {
        try {
          const audioStatus = await Camera.getMicrophonePermissionsAsync();
          setMicPermissionStatus(audioStatus.status === 'granted' ? 'granted' : 'denied');
          console.log('🎤 Microphone permission status:', audioStatus.status);
        } catch (error) {
          console.log('Could not check microphone permission:', error);
        }
      }

      // Check camera permission status (if available, but we won't use it)
      if (isCameraAvailable) {
        try {
          const cameraStatus = await Camera.getCameraPermissionsAsync();
          setCameraPermissionStatus(cameraStatus.status === 'granted' ? 'granted' : 'denied');
          console.log('📷 Camera permission status:', cameraStatus.status);
        } catch (error) {
          console.log('Could not check camera permission:', error);
        }
      }
    } catch (error) {
      console.error('Error checking current permissions:', error);
    }
  };

  const handleBackPress = () => {
    router.back();
  };

  const handleTagPress = () => {
    setShowTagModal(true);
  };

  const handleTagSelect = (tag: LiveTag) => {
    setSelectedTag(tag);
    setShowTagModal(false);
  };

  // Request microphone permission (shared logic)
  // This will show iOS system dialog if permission status is 'undetermined'
  const requestMicrophonePermissionIfNeeded = async (showAlertOnPermanentDenial: boolean = false): Promise<boolean> => {
    if (isExpoGo || !isCameraAvailable) {
      return true; // Allow in Expo Go
    }

    try {
      // Always check the current permission status first
      console.log('🎤 Checking microphone permission status...');
      const currentStatus = await Camera.getMicrophonePermissionsAsync();
      console.log('📋 Current microphone permission status:', {
        status: currentStatus.status,
        canAskAgain: currentStatus.canAskAgain,
        granted: currentStatus.granted
      });

      // If already granted, we're good - update state and return
      if (currentStatus.status === 'granted' || currentStatus.granted === true) {
        console.log('✅ Microphone permission already granted');
        setMicPermissionStatus('granted');
        setMicPermissionRequested(true);
        return true;
      }

      // Always try to request permission - iOS will decide whether to show the dialog
      // iOS will show system dialog if status is 'undetermined' (first time asking)
      // iOS will show dialog again if status is 'denied' but canAskAgain is true
      // iOS will NOT show dialog if status is 'denied' and canAskAgain is false (permanently blocked)
      const status = currentStatus.status;
      const canAskAgain = currentStatus.canAskAgain !== false; // Default to true if not specified
      
      console.log('📋 Permission status before request:', {
        status,
        canAskAgain,
        willShowIOSDialog: status === 'undetermined' || (status === 'denied' && canAskAgain)
      });

      // Always attempt to request permission - iOS will handle showing the dialog appropriately
      // If status is 'undetermined', iOS WILL show the system dialog
      // If status is 'denied' and canAskAgain is true, iOS MIGHT show the dialog again
      // If status is 'denied' and canAskAgain is false, iOS will NOT show the dialog (permanently blocked)
      console.log('🎤 Requesting microphone permission - iOS will show system dialog if needed...');
      console.log('📱 If permission status is "undetermined", iOS will show native dialog with "Allow" and "Don\'t Allow" options');
      
      // IMPORTANT: This call will trigger iOS system permission dialog if status is 'undetermined'
      // The user will see the native iOS dialog with "Allow" and "Don't Allow" buttons
      // If status is 'denied', iOS might not show the dialog - it depends on canAskAgain
      const audioStatus = await Camera.requestMicrophonePermissionsAsync();
      
      console.log('📋 Permission response after request:', {
        status: audioStatus.status,
        granted: audioStatus.granted,
        canAskAgain: audioStatus.canAskAgain
      });
      
      // Update permission status based on response
      const wasGranted = audioStatus.status === 'granted' || audioStatus.granted === true;
      setMicPermissionStatus(wasGranted ? 'granted' : 'denied');
      
      // Mark as requested (so we remember we've asked)
      await AsyncStorage.setItem(MIC_PERMISSION_REQUESTED_KEY, 'true');
      setMicPermissionRequested(true);

      if (wasGranted) {
        console.log('✅ Microphone permission granted by user via iOS system dialog');
        return true;
      } else {
        console.log('❌ Microphone permission denied or not granted');
        
        // Check if permission is permanently blocked (can't show iOS dialog anymore)
        const isPermanentlyBlocked = audioStatus.status === 'denied' && 
                                    audioStatus.canAskAgain === false;
        
        // IMPORTANT: Never show blocking alerts here
        // The iOS system dialog will show if status is 'undetermined'
        // If permission is denied, user can still proceed - don't block them
        console.log('ℹ️ Permission denied - status:', status, 'canAskAgain:', audioStatus.canAskAgain);
        
        // Don't show any alerts here - let the user proceed
        // The iOS system dialog already appeared if status was 'undetermined'
        // If permission is denied, user can still go live (audio won't work)
        
        // User can still proceed to go live (audio just won't work)
        return false;
      }
    } catch (error) {
      console.error('❌ Error requesting microphone permission:', error);
      // On error, don't block the user - let them proceed
      return false;
    }
  };

  // Handle microphone toggle - request permission when enabled
  const handleMicrophoneToggle = async (value: boolean) => {
    setMicrophoneEnabled(value);

    // Only proceed if user is enabling microphone
    if (!value || isExpoGo || !isCameraAvailable) {
      return;
    }

    // Request permission (this will show iOS system dialog if needed)
    await requestMicrophonePermissionIfNeeded();
  };

  // Handle camera toggle - disabled for now (audio-only)
  const handleCameraToggle = (value: boolean) => {
    // Camera is disabled for now - don't allow toggling
    // This will be enabled in the future when video streaming is ready
    console.log('📷 Camera toggle disabled - audio-only streaming only');
    Alert.alert(
      'Camera Disabled',
      'Camera access is currently disabled. We\'re focusing on audio-only streaming for now. Video streaming will be available in a future update.',
      [{ text: 'OK' }]
    );
  };

  const handleGoLive = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be signed in to start a live stream.');
      return;
    }

    // Show development warning if in Expo Go
    if (isExpoGo && showPermissionWarning) {
      Alert.alert(
        'Development Mode',
        'You\'re running in Expo Go. Camera and microphone permissions will be handled automatically in the production build.\n\nContinuing with mock permissions for development.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue Anyway',
            onPress: () => proceedWithStreamCreation()
          }
        ]
      );
      return;
    }

    // If microphone is enabled, ensure we've requested permission before proceeding
    // This ensures iOS system dialog appears if permission status is 'undetermined'
    if (microphoneEnabled && !isExpoGo && isCameraAvailable) {
      console.log('🎤 Ensuring microphone permission is requested before going live...');
      
      // Request permission - this will show iOS system dialog if status is 'undetermined'
      // Pass false to showAlertOnPermanentDenial so we DON'T show alert here
      // We only want to show alert if user explicitly needs to go to settings
      // But actually, let's check status first and only show alert if permanently blocked
      const permissionGranted = await requestMicrophonePermissionIfNeeded(false);
      
      // Don't block here - always allow user to proceed
      // Even if permission is denied, user can go live (audio just won't work)
      console.log('ℹ️ Permission request completed - user can proceed regardless of result');
    }

    // ALWAYS proceed with stream creation (even if permissions are denied)
    // Users can go live without microphone/camera, but audio won't work
    // Never block the user - let them proceed and show a non-blocking notification if needed
    proceedWithStreamCreation();
  };

  const proceedWithStreamCreation = async () => {
    setIsCreatingStream(true);

    try {
      // Use default title if none provided
      const finalTitle = streamTitle.trim() || 'Live Stream';

      const environmentInfo = isExpoGo ? ' (Expo Go - Development Mode)' : '';
      console.log(`🎥 Creating live stream with setup${environmentInfo}:`, {
        title: finalTitle,
        originalTitle: streamTitle.trim(),
        tag: selectedTag.label,
        cameraEnabled: false, // Always false for now (audio-only)
        microphoneEnabled,
        micPermissionStatus,
        hostId: user.uid,
        hostName: user.displayName || 'Host',
        hostAvatar: user.photoURL || 'https://via.placeholder.com/150/6E69F4/FFFFFF?text=H',
        environment: isExpoGo ? 'Expo Go' : 'Production Build'
      });

      // Create stream with configured settings (use finalTitle with fallback)
      // This will automatically check for active streams and show confirmation if needed
      const streamId = await createNewStream(
        finalTitle,
        user.uid,
        user.displayName || 'Host',
        user.photoURL || 'https://via.placeholder.com/150/6E69F4/FFFFFF?text=H'
      );

      console.log('✅ Stream created successfully with ID:', streamId);

      // Navigate to live stream view with configured parameters
      const navigationParams = {
        streamId,
        title: finalTitle, // Use the final title (with fallback applied)
        hostName: user.displayName || 'Host',
        hostAvatar: user.photoURL || 'https://via.placeholder.com/150/6E69F4/FFFFFF?text=H',
        isHost: 'true',
        viewCount: '0',
        tag: selectedTag.label,
        cameraEnabled: 'false', // Always false for now (audio-only)
        microphoneEnabled: microphoneEnabled.toString(),
        createdAt: Date.now().toString(),
        hostId: user.uid,
        environment: isExpoGo ? 'expo-go' : 'production'
      };

      console.log('📋 Navigation parameters:', navigationParams);

      router.push({
        pathname: '/livestream',
        params: navigationParams
      });

    } catch (error: any) {
      console.error('❌ Failed to create stream:', error);

      // Don't show error if user just cancelled the confirmation
      if (error && error.message === 'User cancelled stream creation') {
        console.log('ℹ️ User cancelled stream creation');
        return;
      }

      const errorMessage = isExpoGo
        ? `Development Mode Error:\n\n${error.message}\n\nThis may work differently in the production build.`
        : `Could not create your live stream:\n\n${error.message}\n\nPlease try again.`;

      Alert.alert(
        'Stream Creation Failed',
        errorMessage,
        [{ text: 'OK' }]
      );
    } finally {
      setIsCreatingStream(false);
    }
  };

  const renderTagModal = () => (
    <Modal
      visible={showTagModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowTagModal(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowTagModal(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Choose a tag</Text>
          <FlatList
            data={LIVE_TAGS}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.tagOption, { backgroundColor: `${item.color}20` }]}
                onPress={() => handleTagSelect(item)}
              >
                <View style={[styles.tagColorDot, { backgroundColor: item.color }]} />
                <Text style={styles.tagOptionText}>{item.label}</Text>
                {selectedTag.id === item.id && (
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <Ionicons name="chevron-down" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Title Input */}
        <View style={styles.titleSection}>
          <TextInput
            style={styles.titleInput}
            placeholder="Add a title (optional)"
            placeholderTextColor="#888888"
            value={streamTitle}
            onChangeText={setStreamTitle}
            maxLength={100}
            multiline={false}
          />
          <View style={styles.titleUnderline} />
        </View>

        {/* Tag Selection */}
        <TouchableOpacity style={styles.tagSelector} onPress={handleTagPress}>
          <Text style={styles.tagLabel}>Tag this live</Text>
          <View style={[styles.tagBadge, { backgroundColor: selectedTag.color }]}>
            <Text style={styles.tagBadgeText}>{selectedTag.label}</Text>
          </View>
          <Ionicons name="chevron-down" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomSection}>
        {/* Permission Toggles */}
        <View style={styles.permissionsSection}>
          <Text style={styles.permissionsTitle}>Go live</Text>
          <Text style={styles.permissionsSubtitle}>
            {isExpoGo
              ? 'Development Mode - Permissions will be handled in production build'
              : 'Enable access so you can start a Live'
            }
          </Text>

          {/* Privacy disclosure for microphone usage */}
          <View style={styles.privacyNote}>
            <Text style={styles.privacyNoteText}>
              We use your microphone only while you are live. Your
              audio is transmitted for streaming and is not stored on
              your device.
            </Text>
          </View>

          {/* Development Mode Warning */}
          {isExpoGo && (
            <View style={styles.developmentWarning}>
              <Ionicons name="information-circle" size={16} color="#FFD700" />
              <Text style={styles.developmentWarningText}>
                Running in Expo Go - Permissions will be handled in production build
              </Text>
            </View>
          )}
          
          {/* Camera Toggle - DISABLED (Audio-only for now) */}
          <View style={styles.permissionItem}>
            <View style={styles.permissionLeft}>
              <Ionicons name="videocam" size={24} color="#666666" />
              <View style={styles.permissionTextContainer}>
                <Text style={[styles.permissionText, styles.disabledText]}>Enable camera access</Text>
                <Text style={styles.disabledLabel}>(Audio-only for now)</Text>
              </View>
            </View>
            <Switch
              value={false}
              onValueChange={handleCameraToggle}
              trackColor={{ false: '#3E3E3E', true: '#3E3E3E' }}
              thumbColor="#666666"
              disabled={true}
            />
          </View>

          {/* Microphone Toggle - ENABLED */}
          <View style={styles.permissionItem}>
            <View style={styles.permissionLeft}>
              <Ionicons 
                name="mic" 
                size={24} 
                color={
                  micPermissionStatus === 'granted' 
                    ? '#4CAF50' 
                    : microphoneEnabled 
                      ? '#FFFFFF' 
                      : '#666666'
                } 
              />
              <View style={styles.permissionTextContainer}>
                <Text style={styles.permissionText}>Enable Microphone Access</Text>
                {micPermissionStatus === 'granted' && micPermissionRequested && (
                  <Text style={styles.permissionStatusText}>✓ Granted</Text>
                )}
                {micPermissionStatus === 'denied' && micPermissionRequested && (
                  <Text style={styles.permissionDeniedText}>✗ Denied - Enable in Settings</Text>
                )}
                {micPermissionRequested && micPermissionStatus === 'unknown' && (
                  <Text style={styles.permissionStatusText}>ℹ️ Check your settings</Text>
                )}
              </View>
            </View>
            <Switch
              value={microphoneEnabled}
              onValueChange={handleMicrophoneToggle}
              trackColor={{ false: '#3E3E3E', true: '#FFD700' }}
              thumbColor={microphoneEnabled ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>
        </View>

        {/* Go Live Button */}
        <TouchableOpacity
          style={[styles.goLiveButton, isCreatingStream && styles.goLiveButtonDisabled]}
          onPress={handleGoLive}
          disabled={isCreatingStream}
        >
          <Text style={styles.goLiveButtonText}>
            {isCreatingStream ? 'Creating Stream...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tag Selection Modal */}
      {renderTagModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  titleSection: {
    marginBottom: 40,
    alignItems: 'center',
  },
  titleInput: {
    fontSize: 32,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    minHeight: 50,
  },
  titleUnderline: {
    width: 200,
    height: 2,
    backgroundColor: '#333333',
    marginTop: 10,
  },
  tagSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignSelf: 'center',
  },
  tagLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    marginRight: 10,
  },
  tagBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  tagBadgeText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  permissionsSection: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  permissionsTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  permissionsSubtitle: {
    color: '#888888',
    fontSize: 14,
    marginBottom: 20,
  },
  privacyNote: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 16,
  },
  privacyNoteText: {
    color: '#BBBBBB',
    fontSize: 12,
    lineHeight: 16,
  },
  developmentWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  developmentWarningText: {
    color: '#FFD700',
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  permissionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  permissionTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
  disabledText: {
    color: '#666666',
  },
  disabledLabel: {
    color: '#666666',
    fontSize: 12,
    marginTop: 2,
    fontStyle: 'italic',
  },
  permissionStatusText: {
    color: '#4CAF50',
    fontSize: 12,
    marginTop: 2,
  },
  permissionDeniedText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 2,
  },
  goLiveButton: {
    backgroundColor: PURPLE.base,
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: PURPLE.tintBorder,
  },
  goLiveButtonDisabled: {
    backgroundColor: 'rgba(110,105,244,0.45)',
  },
  goLiveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    width: screenWidth * 0.8,
    maxHeight: screenHeight * 0.6,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  tagOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  tagColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  tagOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
});

export default LiveStreamSetupScreen;
