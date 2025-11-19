/**
 * Web-compatible Voice Message Service Mock
 * Provides basic functionality for web platform where native audio recording isn't available
 */

import { Platform } from 'react-native';

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

class VoiceMessageService {
  private static instance: VoiceMessageService;
  private recordingState: RecordingState = {
    isRecording: false,
    duration: 0,
    waveform: [],
    isPaused: false,
  };
  private playbackState: PlaybackState = {
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
  private mockMediaRecorder: MediaRecorder | null = null;
  private mockAudioChunks: Blob[] = [];

  static getInstance(): VoiceMessageService {
    if (!VoiceMessageService.instance) {
      VoiceMessageService.instance = new VoiceMessageService();
    }
    return VoiceMessageService.instance;
  }

  constructor() {
    console.warn('VoiceMessageService: Running in web mock mode - recording functionality is limited');
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
   * Start recording (web mock implementation)
   */
  async startRecording(): Promise<boolean> {
    try {
      if (this.recordingState.isRecording) {
        console.warn('Already recording');
        return false;
      }

      // Request microphone permission using web API
      if (!navigator.mediaDevices) {
        console.error('Media devices not available');
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.mockMediaRecorder = new MediaRecorder(stream);
      this.mockAudioChunks = [];

      this.mockMediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.mockAudioChunks.push(event.data);
        }
      };

      this.mockMediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.mockAudioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        this.recordingState.uri = audioUrl;
        this.recordingState.isRecording = false;
        this.recordingState.isPaused = false;
        this.stopTimers();
        this.notifyStateChange();
      };

      this.mockMediaRecorder.start();

      this.recordingState = {
        isRecording: true,
        duration: 0,
        waveform: [],
        isPaused: false,
      };

      this.startTimers();
      this.notifyStateChange();

      console.log('✅ Web recording started (mock)');
      return true;

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      return false;
    }
  }

  /**
   * Stop recording (web mock implementation)
   */
  async stopRecording(): Promise<string | null> {
    if (!this.recordingState.isRecording || !this.mockMediaRecorder) {
      console.warn('Not recording');
      return null;
    }

    try {
      this.mockMediaRecorder.stop();
      this.mockMediaRecorder.stream.getTracks().forEach(track => track.stop());
      
      // Wait for the onstop callback to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('✅ Web recording stopped');
      return this.recordingState.uri || null;

    } catch (error) {
      console.error('❌ Failed to stop recording:', error);
      return null;
    }
  }

  /**
   * Pause recording (web mock implementation)
   */
  async pauseRecording(): Promise<boolean> {
    if (!this.recordingState.isRecording || this.recordingState.isPaused) {
      return false;
    }

    try {
      if (this.mockMediaRecorder && this.mockMediaRecorder.state === 'recording') {
        this.mockMediaRecorder.pause();
        this.recordingState.isPaused = true;
        this.stopTimers();
        this.notifyStateChange();
        console.log('✅ Web recording paused');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to pause recording:', error);
      return false;
    }
  }

  /**
   * Resume recording (web mock implementation)
   */
  async resumeRecording(): Promise<boolean> {
    if (!this.recordingState.isRecording || !this.recordingState.isPaused) {
      return false;
    }

    try {
      if (this.mockMediaRecorder && this.mockMediaRecorder.state === 'paused') {
        this.mockMediaRecorder.resume();
        this.recordingState.isPaused = false;
        this.startTimers();
        this.notifyStateChange();
        console.log('✅ Web recording resumed');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to resume recording:', error);
      return false;
    }
  }

  /**
   * Play voice message (web mock implementation)
   */
  async playVoiceMessage(message: VoiceMessage): Promise<boolean> {
    try {
      if (this.playbackState.isPlaying) {
        await this.stopPlayback();
      }

      const audio = new Audio(message.uri);
      
      audio.onended = () => {
        this.stopPlayback();
      };

      audio.onerror = (error) => {
        console.error('❌ Audio playback error:', error);
        this.stopPlayback();
      };

      await audio.play();

      this.playbackState = {
        isPlaying: true,
        currentPosition: 0,
        duration: message.duration,
      };

      this.startPlaybackTimer();
      this.notifyStateChange();

      console.log('✅ Web playback started');
      return true;

    } catch (error) {
      console.error('❌ Failed to play voice message:', error);
      return false;
    }
  }

  /**
   * Stop playback (web mock implementation)
   */
  async stopPlayback(): Promise<void> {
    this.playbackState = {
      isPlaying: false,
      currentPosition: 0,
      duration: 0,
    };

    this.stopPlaybackTimer();
    this.notifyStateChange();
    console.log('✅ Web playback stopped');
  }

  /**
   * Pause playback (web mock implementation)
   */
  async pausePlayback(): Promise<boolean> {
    if (!this.playbackState.isPlaying) {
      return false;
    }

    this.playbackState.isPlaying = false;
    this.stopPlaybackTimer();
    this.notifyStateChange();
    console.log('✅ Web playback paused');
    return true;
  }

  /**
   * Get recorded voice messages (web mock implementation)
   */
  async getVoiceMessages(): Promise<VoiceMessage[]> {
    // Return empty array for web mock
    return [];
  }

  /**
   * Delete voice message (web mock implementation)
   */
  async deleteVoiceMessage(messageId: string): Promise<boolean> {
    console.warn('Voice message deletion not implemented in web mock');
    return false;
  }

  /**
   * Start recording timer
   */
  private startTimers(): void {
    this.recordingTimer = setInterval(() => {
      this.recordingState.duration += 0.1;
      
      // Generate mock waveform data
      if (this.recordingState.waveform.length < 100) {
        this.recordingState.waveform.push(Math.random() * 0.8 + 0.1);
      }
      
      this.notifyStateChange();
    }, 100);
  }

  /**
   * Stop recording timer
   */
  private stopTimers(): void {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
  }

  /**
   * Start playback timer
   */
  private startPlaybackTimer(): void {
    this.playbackTimer = setInterval(() => {
      this.playbackState.currentPosition += 0.1;
      this.notifyStateChange();
    }, 100);
  }

  /**
   * Stop playback timer
   */
  private stopPlaybackTimer(): void {
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopTimers();
    this.stopPlaybackTimer();
    
    if (this.mockMediaRecorder && this.mockMediaRecorder.state !== 'inactive') {
      this.mockMediaRecorder.stop();
    }
  }
}

// Export singleton instance
export const voiceMessageService = VoiceMessageService.getInstance();