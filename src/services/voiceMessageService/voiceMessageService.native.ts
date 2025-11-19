/**
 * Voice Message Service - Native Implementation
 * Handles voice message recording, playback, and audio processing for mobile platforms
 */

import { Audio } from 'expo-audio';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Voice message interfaces
export interface VoiceMessage {
  id: string;
  uri: string;
  duration: number;
  waveform: number[];
  size: number;
  timestamp: number;
  isPlaying?: boolean;
  currentPosition?: number;
}

export interface RecordingState {
  isRecording: boolean;
  duration: number;
  uri?: string;
  waveform: number[];
  isPaused: boolean;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentPosition: number;
  duration: number;
}

export interface VoiceSettings {
  quality: 'low' | 'medium' | 'high';
  maxDuration: number; // seconds
  autoStop: boolean;
  compressionEnabled: boolean;
  noiseReduction: boolean;
}

interface PlaybackStateInternal {
  isPlaying: boolean;
  currentPosition: number;
  duration: number;
}

class VoiceMessageService {
  private static instance: VoiceMessageService;
  private recording: Audio.Recording | null = null;
  private sound: Audio.Sound | null = null;
  private isExpoGo: boolean = false;
  private recordingState: RecordingState = {
    isRecording: false,
    duration: 0,
    waveform: [],
    isPaused: false,
  };
  private playbackState: PlaybackStateInternal = {
    isPlaying: false,
    currentPosition: 0,
    duration: 0,
  };
  private settings: VoiceSettings = {
    quality: 'medium',
    maxDuration: 300, // 5 minutes
    autoStop: true,
    compressionEnabled: true,
    noiseReduction: true,
  };
  private recordingTimer: NodeJS.Timeout | null = null;
  private waveformTimer: NodeJS.Timeout | null = null;
  private playbackTimer: NodeJS.Timeout | null = null;
  private stateChangeListeners: Set<() => void> = new Set();

  static getInstance(): VoiceMessageService {
    if (!VoiceMessageService.instance) {
      VoiceMessageService.instance = new VoiceMessageService();
    }
    return VoiceMessageService.instance;
  }

  constructor() {
    // Detect if we're running in Expo Go
    this.isExpoGo = Constants.appOwnership === 'expo' ||
                    (Constants.executionEnvironment === 'storeClient' && __DEV__);
  }

  /**
   * Add state change listener
   */
  addStateChangeListener(listener: () => void): () => void {
    this.stateChangeListeners.add(listener);
    return () => this.stateChangeListeners.delete(listener);
  }

  /**
   * Notify state change listeners
   */
  private notifyStateChange(): void {
    this.stateChangeListeners.forEach(listener => listener());
  }

  /**
   * Get current recording state
   */
  getRecordingState(): RecordingState {
    return { ...this.recordingState };
  }

  /**
   * Get current playback state
   */
  getPlaybackState(): PlaybackState {
    return { ...this.playbackState };
  }

  /**
   * Get voice settings
   */
  getSettings(): VoiceSettings {
    return { ...this.settings };
  }

  /**
   * Update voice settings
   */
  updateSettings(newSettings: Partial<VoiceSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.notifyStateChange();
  }

  /**
   * Start recording
   */
  async startRecording(): Promise<boolean> {
    try {
      if (this.recordingState.isRecording) {
        console.warn('Already recording');
        return false;
      }

      // Configure audio mode
      try {
        if (Audio && Audio.setAudioModeAsync) {
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: true,
            playsInSilentModeIOS: true,
            staysActiveInBackground: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
          });
        } else {
          console.warn('⚠️ Audio.setAudioModeAsync not available - running in limited mode');
        }
      } catch (error) {
        console.warn('⚠️ Failed to set audio mode:', error);
      }

      // Request permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.error('❌ Audio recording permission denied');
        return false;
      }

      // Create recording
      this.recording = new Audio.Recording();
      
      // Configure recording options
      const recordingOptions = this.getRecordingOptions();
      await this.recording.prepareToRecordAsync(recordingOptions);
      await this.recording.startAsync();

      // Reset state
      this.recordingState = {
        isRecording: true,
        duration: 0,
        waveform: [],
        isPaused: false,
      };

      // Start timers
      this.startRecordingTimer();
      this.startWaveformTimer();

      this.notifyStateChange();
      console.log('✅ Recording started');
      return true;

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      this.recording = null;
      return false;
    }
  }

  /**
   * Stop recording
   */
  async stopRecording(): Promise<string | null> {
    if (!this.recording) {
      console.warn('No recording to stop');
      return null;
    }

    try {
      // Stop the recording
      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      
      // Get recording information
      const status = await this.recording.getStatusAsync();
      const duration = status.durationMillis || 0;
      
      // Update state
      this.recordingState = {
        isRecording: false,
        duration: duration / 1000,
        uri: uri || undefined,
        waveform: this.recordingState.waveform,
        isPaused: false,
      };

      // Stop timers
      this.stopRecordingTimer();
      this.stopWaveformTimer();

      // Clean up
      this.recording = null;

      this.notifyStateChange();
      console.log('✅ Recording stopped:', uri);
      return uri;

    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      this.recording = null;
      return null;
    }
  }

  /**
   * Pause recording
   */
  async pauseRecording(): Promise<boolean> {
    if (!this.recording || !this.recordingState.isRecording) {
      return false;
    }

    try {
      await this.recording.pauseAsync();
      this.recordingState.isPaused = true;
      this.stopRecordingTimer();
      this.stopWaveformTimer();
      this.notifyStateChange();
      console.log('✅ Recording paused');
      return true;
    } catch (error) {
      console.error('❌ Failed to pause recording:', error);
      return false;
    }
  }

  /**
   * Resume recording
   */
  async resumeRecording(): Promise<boolean> {
    if (!this.recording || !this.recordingState.isPaused) {
      return false;
    }

    try {
      await this.recording.startAsync();
      this.recordingState.isPaused = false;
      this.startRecordingTimer();
      this.startWaveformTimer();
      this.notifyStateChange();
      console.log('✅ Recording resumed');
      return true;
    } catch (error) {
      console.error('❌ Failed to resume recording:', error);
      return false;
    }
  }

  /**
   * Play voice message
   */
  async playVoiceMessage(message: VoiceMessage): Promise<boolean> {
    try {
      if (this.playbackState.isPlaying) {
        await this.stopPlayback();
      }

      // Create and load the sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: message.uri },
        { shouldPlay: true }
      );

      this.sound = sound;

      // Set up playback status updates
      this.sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          this.playbackState = {
            isPlaying: status.isPlaying,
            currentPosition: status.positionMillis / 1000,
            duration: status.durationMillis ? status.durationMillis / 1000 : 0,
          };

          if (status.didJustFinish) {
            this.stopPlayback();
          }

          this.notifyStateChange();
        }
      });

      this.notifyStateChange();
      console.log('✅ Playback started');
      return true;

    } catch (error) {
      console.error('❌ Failed to play voice message:', error);
      return false;
    }
  }

  /**
   * Stop playback
   */
  async stopPlayback(): Promise<void> {
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch (error) {
        console.warn('⚠️ Error stopping playback:', error);
      }
      this.sound = null;
    }

    this.playbackState = {
      isPlaying: false,
      currentPosition: 0,
      duration: 0,
    };

    this.notifyStateChange();
    console.log('✅ Playback stopped');
  }

  /**
   * Pause playback
   */
  async pausePlayback(): Promise<boolean> {
    if (!this.sound || !this.playbackState.isPlaying) {
      return false;
    }

    try {
      await this.sound.pauseAsync();
      this.notifyStateChange();
      console.log('✅ Playback paused');
      return true;
    } catch (error) {
      console.error('❌ Failed to pause playback:', error);
      return false;
    }
  }

  /**
   * Get recorded voice messages
   */
  async getVoiceMessages(): Promise<VoiceMessage[]> {
    try {
      const messagesJson = await AsyncStorage.getItem('voice_messages');
      if (messagesJson) {
        return JSON.parse(messagesJson);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load voice messages:', error);
    }
    return [];
  }

  /**
   * Delete voice message
   */
  async deleteVoiceMessage(messageId: string): Promise<boolean> {
    try {
      const messages = await this.getVoiceMessages();
      const filteredMessages = messages.filter(msg => msg.id !== messageId);
      
      await AsyncStorage.setItem('voice_messages', JSON.stringify(filteredMessages));
      console.log('✅ Voice message deleted:', messageId);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete voice message:', error);
      return false;
    }
  }

  /**
   * Start recording timer
   */
  private startRecordingTimer(): void {
    this.recordingTimer = setInterval(() => {
      if (!this.recordingState.isPaused) {
        this.recordingState.duration += 0.1;
        
        // Auto-stop if max duration reached
        if (this.settings.autoStop && this.recordingState.duration >= this.settings.maxDuration) {
          this.stopRecording();
        }
      }
    }, 100);
  }

  /**
   * Stop recording timer
   */
  private stopRecordingTimer(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  /**
   * Start waveform timer
   */
  private startWaveformTimer(): void {
    this.waveformTimer = setInterval(() => {
      if (!this.recordingState.isPaused) {
        // Generate mock waveform data
        const amplitude = Math.random() * 0.8 + 0.1;
        this.recordingState.waveform.push(amplitude);
        
        // Keep waveform array size reasonable
        if (this.recordingState.waveform.length > 200) {
          this.recordingState.waveform.shift();
        }
      }
    }, 50);
  }

  /**
   * Stop waveform timer
   */
  private stopWaveformTimer(): void {
    if (this.waveformTimer) {
      clearInterval(this.waveformTimer);
      this.waveformTimer = null;
    }
  }

  /**
   * Get recording options based on platform and settings
   */
  private getRecordingOptions(): Audio.RecordingOptions {
    const baseOptions: Audio.RecordingOptions = {
      android: {
        extension: '.m4a',
        outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
        audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
        audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
        sampleRate: 44100,
        numberOfChannels: 2,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000,
      },
    };

    // Adjust quality based on settings
    if (this.settings.quality === 'low') {
      baseOptions.android!.bitRate = 64000;
      baseOptions.ios!.audioQuality = Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_LOW;
      baseOptions.ios!.bitRate = 64000;
      baseOptions.web!.bitsPerSecond = 64000;
    } else if (this.settings.quality === 'high') {
      baseOptions.android!.bitRate = 256000;
      baseOptions.ios!.audioQuality = Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_MAX;
      baseOptions.ios!.bitRate = 256000;
      baseOptions.web!.bitsPerSecond = 256000;
    }

    return baseOptions;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopRecordingTimer();
    this.stopWaveformTimer();
    
    if (this.sound) {
      this.sound.unloadAsync();
      this.sound = null;
    }
    
    if (this.recording) {
      this.recording.stopAndUnloadAsync();
      this.recording = null;
    }
  }
}

// Export singleton instance
export const voiceMessageService = VoiceMessageService.getInstance();