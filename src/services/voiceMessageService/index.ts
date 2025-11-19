import { Platform } from 'react-native';

// Platform-specific voice message service
let voiceMessageService: any;

if (Platform.OS === 'web') {
  // Use web mock implementation
  voiceMessageService = require('./voiceMessageService.web').voiceMessageService;
} else {
  // Use native implementation
  voiceMessageService = require('./voiceMessageService.native').voiceMessageService;
}

export { voiceMessageService };

// Re-export types from the web version (they're compatible)
export type {
  VoiceMessage,
  RecordingState,
  PlaybackState,
  VoiceSettings
} from './voiceMessageService.web';