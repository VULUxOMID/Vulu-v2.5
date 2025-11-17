/**
 * Agora Live Streaming Service for VuluGO
 * Handles real-time audio/video streaming integration with Firebase token authentication
 * Uses safe import wrapper to prevent crashes in Expo Go
 */

import {
  RtcEngine,
  RtcEngineEvents,
  ChannelProfile,
  ClientRole,
  AudioProfile,
  AudioScenario,
  VideoEncoderConfiguration,
  ConnectionStateType,
  ConnectionChangedReason,
  UserOfflineReason,
  ErrorCode,
  WarningCode,
  isAgoraAvailable,
  isUsingMockAgora
} from './agoraImportWrapper';

import { agoraTokenService } from './agoraTokenService';

import {
  getAgoraConfig,
  isAgoraConfigured,
  AGORA_CHANNEL_PROFILES,
  AGORA_CLIENT_ROLES,
  AGORA_AUDIO_PROFILES,
  AGORA_AUDIO_SCENARIOS,
} from '../config/agoraConfig';

import * as Device from 'expo-device';
import { Platform } from 'react-native';

export interface AgoraParticipant {
  uid: number;
  userId: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  joinedAt: number;
}

export interface AgoraStreamState {
  isConnected: boolean;
  isJoined: boolean;
  channelName: string;
  localUid: number;
  participants: Map<number, AgoraParticipant>;
  connectionState: ConnectionStateType;
  isAudioMuted: boolean;
  isVideoEnabled: boolean;
}

export interface AgoraEventCallbacks {
  onUserJoined?: (uid: number, elapsed: number) => void;
  onUserOffline?: (uid: number, reason: UserOfflineReason) => void;
  onAudioVolumeIndication?: (speakers: Array<{ uid: number; volume: number }>) => void;
  onConnectionStateChanged?: (state: ConnectionStateType, reason: ConnectionChangedReason) => void;
  onError?: (errorCode: ErrorCode) => void;
  onWarning?: (warningCode: WarningCode) => void;
  onJoinChannelSuccess?: (channel: string, uid: number, elapsed: number) => void;
  onLeaveChannel?: (stats: any) => void;
  onRemoteAudioStateChanged?: (uid: number, state: number, reason: number, elapsed: number) => void;
}

export interface AgoraTokenResponse {
  token: string;
  appId: string;
  channelName: string;
  uid: number;
  role: string;
  expiresAt: number;
}

class AgoraService {
  private static instance: AgoraService;
  private rtcEngine: any = null; // Changed to any to support mock service
  private streamState: AgoraStreamState;
  private config = getAgoraConfig();
  private eventCallbacks: AgoraEventCallbacks = {};
  private joinChannelPromise: {
    channelName: string;
    uid: number;
    timeout: NodeJS.Timeout;
    listeners: Array<{ resolve: (value: boolean) => void; reject: (error: any) => void }>;
  } | null = null;
  private currentToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private isUsingMockService = isUsingMockAgora();
  private currentIsHost: boolean = false; // Track if current user is host

  private constructor() {
    this.streamState = {
      isConnected: false,
      isJoined: false,
      channelName: '',
      localUid: 0,
      participants: new Map(),
      connectionState: ConnectionStateType.Disconnected,
      isAudioMuted: false,
      isVideoEnabled: false,
    };
  }

  static getInstance(): AgoraService {
    if (!AgoraService.instance) {
      AgoraService.instance = new AgoraService();
    }
    return AgoraService.instance;
  }

  /**
   * Initialize Agora RTC Engine (or mock service in development)
   */
  async initialize(): Promise<boolean> {
    try {
      // Use mock service when Agora SDK is not available
      if (isUsingMockAgora()) {
        console.log('🎭 Initializing Mock Agora Service for development');
        const { mockAgoraService } = require('./agoraServiceMock');
        await mockAgoraService.initialize('mock-app-id');
        this.rtcEngine = mockAgoraService as any; // Cast to satisfy TypeScript
        // Forward any existing callbacks to the mock engine so UI receives events
        try {
          if (this.eventCallbacks && typeof (this.rtcEngine as any).setEventCallbacks === 'function') {
            (this.rtcEngine as any).setEventCallbacks(this.eventCallbacks);
          }
        } catch (e) {
          console.warn('⚠️ Failed to forward callbacks to mock Agora service:', e);
        }
        console.log('✅ Mock Agora Service initialized successfully');
        return true;
      }

      if (!isAgoraConfigured()) {
        console.warn('⚠️ Agora not configured. Cannot initialize RTC engine.');
        return false;
      }

      // Check if running on simulator
      if (!Device.isDevice) {
        console.error('❌ Agora SDK does not support iOS/Android Simulators');
        console.error('📱 Please test on a REAL DEVICE for audio streaming to work');
        console.error('💡 Run: npx expo run:ios --device');
        throw new Error('Agora SDK requires a physical device. Please run on real iOS/Android hardware.');
      }

      if (this.rtcEngine) {
        console.log('✅ Agora RTC Engine already initialized');
        return true;
      }

      console.log('🔄 Initializing Agora RTC Engine...');

      // Create RTC Engine instance
      // For v4.5.3+, createAgoraRtcEngine() returns an engine that must be initialized manually
      let usingNewAPI = false;
      try {
        this.rtcEngine = await RtcEngine.create();
        usingNewAPI = typeof this.rtcEngine?.initialize === 'function';
        console.log('✅ Engine instance created (new API)');
      } catch (error) {
        console.log('⚠️ New API create() failed, trying legacy create(appId)...', error?.message || error);
        this.rtcEngine = await RtcEngine.create(this.config.appId);
        usingNewAPI = false;
        console.log('✅ Engine created with legacy API');
      }

      // Initialize engine for new API
      if (usingNewAPI) {
        console.log('🔧 Calling rtcEngine.initialize with appId');
        await this.rtcEngine.initialize({
          appId: this.config.appId,
        });
      }

      // Small delay to allow engine to finish bootstrapping
      console.log('⏳ Waiting for engine to be ready...');
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('✅ Engine ready delay completed');

      // Debug: Log available methods and enum values (best effort)
      try {
        console.log('🔍 Engine methods:', Object.keys(this.rtcEngine).filter(k => typeof this.rtcEngine[k] === 'function').slice(0, 10).join(', '));
      } catch (_) {
        console.log('🔍 Engine methods unavailable (non-enumerable)');
      }
      console.log('🔍 ChannelProfile enum:', ChannelProfile);
      console.log('🔍 AudioProfile enum:', AudioProfile);
      console.log('🔍 AudioScenario enum:', AudioScenario);

      // Set channel profile for live broadcasting
      // Use numeric value directly: LiveBroadcasting = 1
      // From logs: ChannelProfileLiveBroadcasting: 1
      const channelProfileValue = typeof ChannelProfile?.ChannelProfileLiveBroadcasting === 'number' 
        ? ChannelProfile.ChannelProfileLiveBroadcasting 
        : (typeof ChannelProfile?.LiveBroadcasting === 'number' 
          ? ChannelProfile.LiveBroadcasting 
          : 1); // Default to 1 if enum not found
      
      console.log('🔄 Setting channel profile to LiveBroadcasting, numeric value:', channelProfileValue);
      try {
        const profileResult = await this.rtcEngine.setChannelProfile(channelProfileValue);
        // -7 (ERR_NOT_READY) is non-critical - engine may not be fully ready yet but will be when joining
        // Native log shows result 0 (success), JS wrapper returns -7 from outdata, but this is OK
        if (profileResult === 0) {
          console.log('✅ Channel profile set successfully');
        } else if (profileResult === -7) {
          console.log('ℹ️ Channel profile set (engine not fully ready yet, will be ready when joining)');
        } else {
          console.warn('⚠️ setChannelProfile returned unexpected result:', profileResult);
        }
      } catch (error) {
        console.error('❌ Error setting channel profile:', error);
      }

      // Configure audio settings for social streaming
      // Use numeric values directly:
      // - AudioProfileMusicHighQuality = 4
      // - AudioScenarioChatroom = 5 (not ChatRoomEntertainment = 1)
      // From logs: AudioProfileMusicHighQuality: 4, AudioScenarioChatroom: 5
      const audioProfileValue = typeof AudioProfile?.AudioProfileMusicHighQuality === 'number'
        ? AudioProfile.AudioProfileMusicHighQuality
        : (typeof AudioProfile?.MusicHighQuality === 'number'
          ? AudioProfile.MusicHighQuality
          : 4); // Default to 4 if enum not found
      
      const audioScenarioValue = typeof AudioScenario?.AudioScenarioChatroom === 'number'
        ? AudioScenario.AudioScenarioChatroom
        : (typeof AudioScenario?.ChatRoomEntertainment === 'number'
          ? AudioScenario.ChatRoomEntertainment
          : 5); // Default to 5 (Chatroom) if enum not found
      
      console.log('🔄 Setting audio profile:', { profile: audioProfileValue, scenario: audioScenarioValue });
      try {
        const audioResult = await this.rtcEngine.setAudioProfile(audioProfileValue, audioScenarioValue);
        // -7 (ERR_NOT_READY) is non-critical - engine may not be fully ready yet but will be when joining
        // Native log shows result 0 (success), JS wrapper returns -7 from outdata, but this is OK
        if (audioResult === 0) {
          console.log('✅ Audio profile set successfully');
        } else if (audioResult === -7) {
          console.log('ℹ️ Audio profile set (engine not fully ready yet, will be ready when joining)');
        } else {
          console.warn('⚠️ setAudioProfile returned unexpected result:', audioResult);
        }
      } catch (error) {
        console.error('❌ Error setting audio profile:', error);
      }

      // Enable audio volume indication for speaking indicators
      await this.rtcEngine.enableAudioVolumeIndication(200, 3, true);

      // Setup event listeners
      this.setupEventListeners();
      
      // Wait a bit more after setting up listeners to ensure they're registered
      await new Promise(resolve => setTimeout(resolve, 200));

      // Wait for engine to be ready by polling a simple API call
      // The engine is ready when API calls stop returning -7
      console.log('⏳ Waiting for engine to be fully ready...');
      let readyAttempts = 0;
      const maxReadyAttempts = 20; // 20 attempts * 200ms = 4 seconds max
      while (readyAttempts < maxReadyAttempts) {
        try {
          // Try a simple API call that should work when engine is ready
          // getConnectionState is a read-only call that should work even if engine isn't fully ready
          // But if it returns -7, the engine definitely isn't ready
          const testResult = await this.rtcEngine.getConnectionState();
          if (testResult !== -7) {
            console.log('✅ Engine is ready (getConnectionState returned non--7)');
            break;
          }
        } catch (error) {
          // Ignore errors, just continue polling
        }
        
        readyAttempts++;
        if (readyAttempts < maxReadyAttempts) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      if (readyAttempts >= maxReadyAttempts) {
        console.warn('⚠️ Engine readiness check timed out, but continuing anyway');
      } else {
        console.log(`✅ Engine became ready after ${readyAttempts * 200}ms`);
      }
      
      // Additional wait after configuration to ensure engine processes all settings
      // This helps prevent -7 errors when joining immediately after configuration
      console.log('⏳ Waiting additional time for engine to process configuration...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second additional wait

      this.streamState.isConnected = true;
      console.log('✅ Agora RTC Engine initialized successfully');
      return true;

    } catch (error: any) {
      console.error('❌ Failed to initialize Agora RTC Engine:', error);
      return false;
    }
  }

  /**
   * Set up Agora event listeners
   */
  private setupEventListeners(): void {
    if (!this.rtcEngine) return;

    console.log('📡 Setting up Agora event listeners');

    // User joined channel
    this.rtcEngine.addListener('UserJoined', (uid: number, elapsed: number) => {
      console.log('👤 User joined:', uid);
      this.eventCallbacks.onUserJoined?.(uid, elapsed);
    });

    // User left channel
    this.rtcEngine.addListener('UserOffline', (uid: number, reason: UserOfflineReason) => {
      console.log('👤 User offline:', uid, 'reason:', reason);
      this.streamState.participants.delete(uid);
      this.eventCallbacks.onUserOffline?.(uid, reason);
    });

    // Audio volume indication (speaking indicators)
    this.rtcEngine.addListener('AudioVolumeIndication', (speakers: Array<{ uid: number; volume: number }>) => {
      // Update speaking status for participants
      speakers.forEach(speaker => {
        const participant = this.streamState.participants.get(speaker.uid);
        if (participant) {
          participant.isSpeaking = speaker.volume > 5; // Threshold for speaking
          participant.audioLevel = speaker.volume;
        }
      });
      this.eventCallbacks.onAudioVolumeIndication?.(speakers);
    });

    // Connection state changed
    this.rtcEngine.addListener('ConnectionStateChanged', (state: ConnectionStateType, reason: ConnectionChangedReason) => {
      console.log('🔗 Connection state changed: state=', state, 'reason=', reason);
      this.streamState.connectionState = state;
      
      // FALLBACK: If JoinChannelSuccess doesn't fire, use ConnectionStateChanged as backup
      // When state is Connected (3) and reason is JoinSuccess (1), treat as successful join
      // Check both enum values and numeric values for compatibility
      const isConnected = state === ConnectionStateType.Connected || state === 3;
      const isJoinSuccess = reason === ConnectionChangedReason.JoinSuccess || reason === 1;
      
      if (isConnected && isJoinSuccess) {
        console.log('✅ Connection state indicates successful join (fallback detection)');
        
        // Only resolve if we're waiting for a join and haven't already resolved
        if (this.joinChannelPromise && this.streamState.isJoined === false) {
          // Get channel name and UID from current state (they should be set by now)
          const channelName = this.streamState.channelName || '';
          const uid = this.streamState.localUid || 0;
          
          console.log('✅ Resolving join promise via ConnectionStateChanged fallback: channel=', channelName, 'uid=', uid);
          
          this.streamState.isJoined = true;
          this.resolvePendingJoin(true);
          
          // Trigger the onJoinChannelSuccess callback for consistency
          this.eventCallbacks.onJoinChannelSuccess?.(channelName, uid, 0);
        } else if (this.joinChannelPromise && this.streamState.isJoined === true) {
          console.log('ℹ️ Join already marked as successful, skipping fallback resolution');
        } else if (!this.joinChannelPromise) {
          console.log('ℹ️ No join promise pending, skipping fallback resolution');
        }
      }
      
      this.eventCallbacks.onConnectionStateChanged?.(state, reason);
    });

    // Join channel success
    // Register the primary event listener
    // NOTE: Agora v4.5.3+ passes an object instead of separate params: { channelId: string, localUid: number }
    this.rtcEngine.addListener('JoinChannelSuccess', async (...args: any[]) => {
      // Handle both old and new callback formats
      let channel: string;
      let uid: number;
      let elapsed: number = 0;

      if (args.length === 1 && typeof args[0] === 'object' && args[0].channelId) {
        // New format: single object parameter
        channel = args[0].channelId;
        uid = args[0].localUid;
        console.log('✅ [JoinChannelSuccess] Successfully joined channel:', channel, 'UID:', uid, '(new format)');
      } else {
        // Old format: separate parameters
        channel = args[0];
        uid = args[1];
        elapsed = args[2] || 0;
        console.log('✅ [JoinChannelSuccess] Successfully joined channel:', channel, 'UID:', uid, 'elapsed:', elapsed);
      }

      this.streamState.isJoined = true;
      this.streamState.channelName = channel;
      this.streamState.localUid = uid;
      
      // Resolve the join promise if it exists
      if (this.joinChannelPromise) {
        console.log('✅ Resolving join promise via JoinChannelSuccess callback');
        this.resolvePendingJoin(true);
      }
      
      // Use the stored isHost flag (set during joinChannel)
      const isHost = this.currentIsHost;
      
      // For hosts: ensure audio is unmuted by default
      // For audience: ensure remote audio subscription is enabled (should be automatic, but ensure it)
      if (isHost) {
        console.log('🎤 Host joined - ensuring audio is unmuted');
        // Unmute host audio by default
        try {
          await this.muteLocalAudio(false);
        } catch (error) {
          console.warn('⚠️ Failed to unmute host audio:', error);
        }
      } else {
        console.log('👂 Audience member joined - remote audio subscription should be automatic');
        // In Live Broadcasting mode, audience members automatically subscribe to remote audio
        // But we can explicitly ensure it's enabled (though it should be by default)
        // Note: muteAllRemoteAudioStreams(false) ensures all remote audio is unmuted
        try {
          if (typeof this.rtcEngine.muteAllRemoteAudioStreams === 'function') {
            await this.rtcEngine.muteAllRemoteAudioStreams(false);
            console.log('✅ Ensured remote audio subscription is enabled for audience');
          }
        } catch (error) {
          console.warn('⚠️ Failed to ensure remote audio subscription:', error);
        }
      }
      
      this.eventCallbacks.onJoinChannelSuccess?.(channel, uid, elapsed);
    });
    
    // Also try alternative event names (some SDK versions use different names)
    // These will only fire if the event name matches, so no harm in registering multiple
    try {
      this.rtcEngine.addListener('onJoinChannelSuccess', async (...args: any[]) => {
        // Handle both old and new callback formats
        let channel: string;
        let uid: number;
        let elapsed: number = 0;

        if (args.length === 1 && typeof args[0] === 'object' && args[0].channelId) {
          // New format: single object parameter
          channel = args[0].channelId;
          uid = args[0].localUid;
          console.log('✅ [onJoinChannelSuccess] Successfully joined channel:', channel, 'UID:', uid, '(new format)');
        } else {
          // Old format: separate parameters
          channel = args[0];
          uid = args[1];
          elapsed = args[2] || 0;
          console.log('✅ [onJoinChannelSuccess] Successfully joined channel:', channel, 'UID:', uid);
        }

        // Same handling as above, but check if already resolved to avoid double resolution
        if (!this.streamState.isJoined && this.joinChannelPromise) {
          this.streamState.isJoined = true;
          this.streamState.channelName = channel;
          this.streamState.localUid = uid;
          this.resolvePendingJoin(true);
          this.eventCallbacks.onJoinChannelSuccess?.(channel, uid, elapsed);
        }
      });
    } catch (e) {
      // Event name doesn't exist, that's fine
      console.log('ℹ️ Alternative event name "onJoinChannelSuccess" not available');
    }

    // Leave channel
    this.rtcEngine.addListener('LeaveChannel', (stats: any) => {
      console.log('👋 Left channel');
      this.streamState.isJoined = false;
      this.streamState.participants.clear();
      this.eventCallbacks.onLeaveChannel?.(stats);
    });

    // Error handling
    this.rtcEngine.addListener('Error', (errorCode: ErrorCode) => {
      console.error(`❌ Agora Error: ${errorCode}`);
      
      // If we're waiting for a join and get an error, reject the promise
      // Some error codes indicate join failure (e.g., -5 = ERR_REFUSED, -17 = ERR_JOIN_CHANNEL_REJECTED)
      if (this.joinChannelPromise && (errorCode === -5 || errorCode === -17 || errorCode < 0)) {
        const errorMsg = `Join channel failed with error code: ${errorCode}`;
        console.error(`❌ ${errorMsg}`);
        this.rejectPendingJoin(new Error(errorMsg));
      }
      
      this.eventCallbacks.onError?.(errorCode);
    });

    // Warning handling
    this.rtcEngine.addListener('Warning', (warningCode: WarningCode) => {
      console.warn(`⚠️ Agora Warning: ${warningCode}`);
      this.eventCallbacks.onWarning?.(warningCode);
    });

    // Remote audio state changed
    this.rtcEngine.addListener('RemoteAudioStateChanged', (uid: number, state: number, reason: number, elapsed: number) => {
      console.log('🔊 Remote audio state changed for uid:', uid, 'state:', state, 'reason:', reason);
      const participant = this.streamState.participants.get(uid);
      if (participant) {
        participant.isMuted = state === 0; // 0 = stopped, 2 = decoding
      }
      this.eventCallbacks.onRemoteAudioStateChanged?.(uid, state, reason, elapsed);
    });
  }

  /**
   * Generate Agora token using token service
   */
  private async generateToken(channelName: string, uid: number, role: 'host' | 'audience'): Promise<AgoraTokenResponse> {
    try {
      const tokenData = await agoraTokenService.generateToken({
        channelName,
        uid,
        role,
        expirationTimeInSeconds: 3600 // 1 hour
      });

      this.currentToken = tokenData.token;
      this.tokenExpiresAt = tokenData.expiresAt;

      return tokenData;

    } catch (error: any) {
      console.error('❌ Failed to generate Agora token:', error);
      throw error;
    }
  }

  /**
   * Check if token needs renewal (within 5 minutes of expiry)
   */
  private needsTokenRenewal(): boolean {
    const fiveMinutesFromNow = Date.now() + (5 * 60 * 1000);
    return this.tokenExpiresAt < fiveMinutesFromNow;
  }

  /**
   * Renew token for current channel
   */
  async renewToken(): Promise<boolean> {
    try {
      if (!this.streamState.isJoined || !this.rtcEngine) {
        console.warn('⚠️ Cannot renew token - not joined to channel');
        return false;
      }

      console.log('🔄 Renewing Agora token...');

      const uid = this.streamState.localUid;
      const channelName = this.streamState.channelName;

      // Determine role based on current state (simplified)
      const isHost = this.streamState.participants.get(uid)?.isHost || false;
      const role = isHost ? 'host' : 'audience';

      const tokenData = await agoraTokenService.renewTokenIfNeeded(
        channelName,
        uid,
        role,
        this.tokenExpiresAt
      );

      if (tokenData) {
        // Update token in the engine
        await this.rtcEngine.renewToken(tokenData.token);
        this.currentToken = tokenData.token;
        this.tokenExpiresAt = tokenData.expiresAt;

        console.log('✅ Token renewed successfully');
        return true;
      }

      return false; // Token was still valid

    } catch (error: any) {
      console.error('❌ Failed to renew token:', error);
      return false;
    }
  }

  /**
   * Validate stream access before joining
   */
  async validateStreamAccess(streamId: string): Promise<boolean> {
    try {
      const validation = await agoraTokenService.validateStreamAccess(streamId);
      // In dev mode, always allow access even if validation returns false
      // (validation service already handles not-found errors, but be extra permissive)
      if (__DEV__ && !validation.canJoin) {
        console.warn('⚠️ Stream access validation returned false, but allowing in dev mode');
        return true;
      }
      return validation.canJoin;
    } catch (error: any) {
      // If validation service already handled the error and returned canJoin: true,
      // we shouldn't get here. But if we do, allow access in dev mode
      console.warn('⚠️ Stream access validation error (allowing in dev mode):', error);
      if (__DEV__) {
        return true; // Allow access in development
      }
      return false;
    }
  }

  /**
   * Simplified: Attempt to join channel (no retries, just try once)
   */
  private async attemptJoinChannel(token: string, channelName: string, uid: number): Promise<number> {
    try {
      const joinResult = await this.rtcEngine.joinChannel(token, channelName, uid);
      console.log(`🔄 Join channel call result: ${joinResult}`);
      return joinResult;
    } catch (error: any) {
      console.error('❌ joinChannel call failed:', error);
      throw error;
    }
  }

  /**
   * Attach to an in-flight join attempt
   */
  private attachToPendingJoin(): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
      if (!this.joinChannelPromise) {
        resolve(this.streamState.isJoined);
        return;
      }

      this.joinChannelPromise.listeners.push({ resolve, reject });
    });
  }

  /**
   * Resolve the pending join promise (and all attached listeners)
   */
  private resolvePendingJoin(result: boolean = true): void {
    if (!this.joinChannelPromise) {
      return;
    }

    const pending = this.joinChannelPromise;
    clearTimeout(pending.timeout);
    this.joinChannelPromise = null;

    pending.listeners.forEach(listener => {
      try {
        listener.resolve(result);
      } catch (error) {
        console.warn('⚠️ Error resolving join listener:', error);
      }
    });
  }

  /**
   * Reject the pending join promise (and all attached listeners)
   */
  private rejectPendingJoin(error: any): void {
    if (!this.joinChannelPromise) {
      return;
    }

    const pending = this.joinChannelPromise;
    clearTimeout(pending.timeout);
    this.joinChannelPromise = null;

    pending.listeners.forEach(listener => {
      try {
        listener.reject(error);
      } catch (listenerError) {
        console.warn('⚠️ Error rejecting join listener:', listenerError);
      }
    });
  }

  /**
   * Simplified: Join a streaming channel
   * No complex retries, timeouts, or validations - just join
   */
  async joinChannel(
    channelName: string,
    userId: string,
    isHost: boolean = false,
    providedToken?: string
  ): Promise<boolean> {
    try {
      // Initialize if needed
      if (!this.streamState.isConnected) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize Agora engine');
        }
      }

      if (!this.rtcEngine) {
        throw new Error('RTC Engine not initialized');
      }

      // Generate UID from userId up front (needed for duplicate detection)
      const uid = this.generateUidFromUserId(userId);

      // If another join is already pending, either attach to it (same channel) or wait for it to finish
      if (this.joinChannelPromise) {
        const pendingChannel = this.joinChannelPromise.channelName;
        const pendingUid = this.joinChannelPromise.uid;

        if (pendingChannel === channelName && pendingUid === uid) {
          console.log('♻️ Join request already pending for this channel/uid, waiting for completion');
          return this.attachToPendingJoin();
        }

        console.log(`⏳ Join already pending for ${pendingChannel}. Waiting before joining ${channelName}...`);
        try {
          await this.attachToPendingJoin();
        } catch (pendingError: any) {
          console.warn('⚠️ Previous join attempt failed while waiting:', pendingError?.message || pendingError);
        }
      }

      // If we're already joined to this channel with the same UID, just reuse the session
      if (this.streamState.isJoined) {
        const sameChannel = this.streamState.channelName === channelName;
        const sameUid = this.streamState.localUid === uid;

        if (sameChannel && sameUid) {
          console.log('♻️ Already joined target channel, reusing existing Agora session');
          this.currentIsHost = isHost;

          // Ensure client role/audio subscriptions align with latest request
          const clientRole = isHost ? 1 : 2;
          try {
            if (this.rtcEngine && !this.isUsingMockService) {
              await this.rtcEngine.setClientRole(clientRole);
              if (!isHost && typeof this.rtcEngine.muteAllRemoteAudioStreams === 'function') {
                await this.rtcEngine.muteAllRemoteAudioStreams(false);
              }
            }
          } catch (error) {
            console.warn('⚠️ Failed to refresh client role for existing session:', error);
          }

          // Notify listeners asynchronously so UI can sync state without triggering a new join
          setTimeout(() => {
            try {
              this.eventCallbacks.onJoinChannelSuccess?.(channelName, uid, 0);
            } catch (callbackError) {
              console.warn('⚠️ Error in JoinChannelSuccess callback (reuse):', callbackError);
            }
          }, 0);

          return true;
        }

        // Different channel/UID: leave first to avoid ERR_JOIN_CHANNEL_REJECTED (-17)
        console.log('ℹ️ Already joined', this.streamState.channelName, '- leaving before joining', channelName);
        await this.leaveChannel();
      }

      console.log(`🔄 Joining channel: ${channelName} as ${isHost ? 'host' : 'audience'}`);

      // Store isHost flag
      this.currentIsHost = isHost;

      // Handle mock service
      if (this.isUsingMockService) {
        console.log('🎭 Using mock service to join channel');
        await this.rtcEngine.joinChannel('mock-token', channelName, uid, isHost);
        this.streamState.isJoined = true;
        this.streamState.channelName = channelName;
        this.streamState.localUid = uid;
        return true;
      }

      // Set client role
      const clientRole = isHost ? 1 : 2; // 1 = Broadcaster, 2 = Audience
      await this.rtcEngine.setClientRole(clientRole);
      console.log(`✅ Client role set: ${isHost ? 'Broadcaster' : 'Audience'}`);

      // For audience, ensure remote audio is enabled
      if (!isHost) {
        try {
          if (typeof this.rtcEngine.muteAllRemoteAudioStreams === 'function') {
            await this.rtcEngine.muteAllRemoteAudioStreams(false);
          }
        } catch (error) {
          console.warn('⚠️ Failed to enable remote audio:', error);
        }
      }

      // Get token
      let token = providedToken;
      if (!token || this.needsTokenRenewal()) {
        const tokenData = await this.generateToken(channelName, uid, isHost ? 'host' : 'audience');
        token = tokenData.token;
      }

      // Store channel info
      this.streamState.channelName = channelName;
      this.streamState.localUid = uid;

      // Join channel - simple promise with 15 second timeout
      return new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.error('⏰ Join channel timeout');
          this.rejectPendingJoin(new Error('Join channel timeout'));
        }, 15000);

        this.joinChannelPromise = {
          channelName,
          uid,
          timeout,
          listeners: [{ resolve, reject }],
        };

        // Attempt join
        this.attemptJoinChannel(token, channelName, uid)
          .then((joinResult) => {
            if (joinResult === 0 || joinResult === -7) {
              // 0 = success, -7 = not ready but might still work
              // Wait for callback
              console.log(`⏳ Join initiated (result: ${joinResult}), waiting for callback...`);
            } else {
              // Other error - fail immediately
              this.rejectPendingJoin(new Error(`Join failed with code: ${joinResult}`));
            }
          })
          .catch((error) => {
            this.rejectPendingJoin(error);
          });
      });

    } catch (error: any) {
      console.error('❌ Failed to join channel:', error);
      if (this.joinChannelPromise) {
        this.rejectPendingJoin(error);
      }
      throw error; // Throw instead of returning false
    }
  }

  /**
   * Leave the current channel
   */
  async leaveChannel(force: boolean = false): Promise<void> {
    try {
      if (!this.rtcEngine) return;

      const hasPendingJoin = !!this.joinChannelPromise;
      const hasChannelContext = !!this.streamState.channelName;
      const shouldLeave = force || this.streamState.isJoined || hasPendingJoin || hasChannelContext;

      if (!shouldLeave) {
        return;
      }

      console.log(`🔄 Leaving channel${force ? ' (force)' : ''}...`);

      if (hasPendingJoin) {
        this.rejectPendingJoin(new Error('Leave channel invoked while join was pending'));
      }

      // Handle mock service
      if (this.isUsingMockService) {
        console.log('🎭 Using mock service to leave channel');
        await this.rtcEngine.leaveChannel();
      } else {
        // Leave the channel even if join never completed
        await this.rtcEngine.leaveChannel();
      }

      // Reset state (will be updated by event listener as well)
      this.streamState.isJoined = false;
      this.streamState.channelName = '';
      this.streamState.localUid = 0;
      this.streamState.participants.clear();
      this.currentToken = null;
      this.tokenExpiresAt = 0;
      this.currentIsHost = false;

      console.log('✅ Successfully left channel');

    } catch (error: any) {
      console.error('❌ Failed to leave channel:', error);
      throw error;
    }
  }

  /**
   * Mute/unmute local audio
   */
  async muteLocalAudio(muted: boolean): Promise<void> {
    try {
      if (!this.rtcEngine) return;

      await this.rtcEngine.muteLocalAudioStream(muted);
      this.streamState.isAudioMuted = muted;
      console.log(`🔇 Local audio ${muted ? 'muted' : 'unmuted'}`);

    } catch (error: any) {
      console.error('❌ Failed to mute/unmute audio:', error);
    }
  }

  /**
   * Enable/disable local video
   */
  async enableLocalVideo(enabled: boolean): Promise<void> {
    try {
      if (!this.rtcEngine || !this.config.enableVideoStreaming) return;

      if (enabled) {
        await this.rtcEngine.enableVideo();
        await this.rtcEngine.startPreview();
      } else {
        await this.rtcEngine.disableVideo();
        await this.rtcEngine.stopPreview();
      }

      this.streamState.isVideoEnabled = enabled;
      console.log(`📹 Local video ${enabled ? 'enabled' : 'disabled'}`);

    } catch (error: any) {
      console.error('❌ Failed to enable/disable video:', error);
    }
  }

  /**
   * Switch camera (front/back)
   */
  async switchCamera(): Promise<void> {
    try {
      if (!this.rtcEngine || !this.streamState.isVideoEnabled) return;

      await this.rtcEngine.switchCamera();
      console.log('📷 Camera switched');

    } catch (error: any) {
      console.error('❌ Failed to switch camera:', error);
    }
  }

  /**
   * Adjust recording signal volume
   */
  async adjustRecordingSignalVolume(volume: number): Promise<void> {
    try {
      if (!this.rtcEngine) return;

      // Volume range: 0-400 (0 = mute, 100 = original, 400 = 4x amplification)
      const adjustedVolume = Math.max(0, Math.min(400, volume));
      await this.rtcEngine.adjustRecordingSignalVolume(adjustedVolume);
      console.log(`🔊 Recording volume adjusted to: ${adjustedVolume}`);

    } catch (error: any) {
      console.error('❌ Failed to adjust recording volume:', error);
    }
  }

  /**
   * Set event callbacks
   */
  setEventCallbacks(callbacks: AgoraEventCallbacks): void {
    const prev = this.eventCallbacks;
    const combined: AgoraEventCallbacks = { ...prev };

    const keys: Array<keyof AgoraEventCallbacks> = [
      'onUserJoined',
      'onUserOffline',
      'onAudioVolumeIndication',
      'onConnectionStateChanged',
      'onError',
      'onWarning',
      'onJoinChannelSuccess',
      'onLeaveChannel',
      'onRemoteAudioStateChanged'
    ];

    keys.forEach((key) => {
      const nextCb = callbacks[key];
      if (nextCb) {
        const prevCb = prev[key];
        combined[key] = ((...args: any[]) => {
          try { prevCb?.(...args as any); } catch (e) { console.warn(`⚠️ Error in previous ${String(key)} callback:`, e); }
          try { (nextCb as any)(...args); } catch (e) { console.warn(`⚠️ Error in new ${String(key)} callback:`, e); }
        }) as any;
      }
    });

    this.eventCallbacks = combined;

    try {
      // Forward callbacks to mock service if supported so UI receives events
      if (this.rtcEngine && typeof (this.rtcEngine as any).setEventCallbacks === 'function') {
        (this.rtcEngine as any).setEventCallbacks(this.eventCallbacks);
      }
    } catch (e) {
      console.warn('⚠️ Failed to forward event callbacks to RTC engine:', e);
    }
    console.log('📡 Event callbacks set');
  }

  /**
   * Get current stream state
   */
  getStreamState(): AgoraStreamState {
    return {
      ...this.streamState,
      participants: new Map(this.streamState.participants) // Create a copy of the Map
    };
  }

  /**
   * Get participant by UID
   */
  getParticipant(uid: number): AgoraParticipant | undefined {
    return this.streamState.participants.get(uid);
  }

  /**
   * Get all participants as array
   */
  getParticipants(): AgoraParticipant[] {
    return Array.from(this.streamState.participants.values());
  }

  /**
   * Add or update participant
   */
  updateParticipant(uid: number, participant: Partial<AgoraParticipant>): void {
    const existing = this.streamState.participants.get(uid);
    if (existing) {
      this.streamState.participants.set(uid, { ...existing, ...participant });
    } else {
      // Create new participant with defaults
      const newParticipant: AgoraParticipant = {
        uid,
        userId: participant.userId || `user_${uid}`,
        name: participant.name || `User ${uid}`,
        avatar: participant.avatar || '',
        isHost: participant.isHost || false,
        isMuted: participant.isMuted || false,
        isSpeaking: participant.isSpeaking || false,
        audioLevel: participant.audioLevel || 0,
        joinedAt: participant.joinedAt || Date.now(),
        ...participant
      };
      this.streamState.participants.set(uid, newParticipant);
    }
  }

  /**
   * Remove participant
   */
  removeParticipant(uid: number): void {
    this.streamState.participants.delete(uid);
  }

  /**
   * Generate consistent UID from user ID
   */
  private generateUidFromUserId(userId: string): number {
    // Simple hash function to generate consistent numeric UID
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    let uid = Math.abs(hash) % 2147483647;
    if (uid === 0) {
      uid = Math.floor(1 + Math.random() * 2147483646);
    }
    return uid; // Ensure positive, non-zero, within Agora's UID range
  }

  /**
   * Critical: Clean up Agora resources to prevent memory leaks
   */
  async cleanup(): Promise<void> {
    try {
      console.log('🧹 Cleaning up Agora resources...');

      // Leave channel if connected or pending
      await this.leaveChannel(true);

      if (this.rtcEngine) {
        // Destroy engine instance
        try {
          await this.rtcEngine.destroy();
        } catch (destroyError) {
          console.warn('Error destroying engine:', destroyError);
        }

        this.rtcEngine = null;
      }

      // Clear any cached data
      this.streamState.channelName = '';
      this.streamState.localUid = 0;
      this.streamState.isConnected = false;
      this.streamState.isJoined = false;
      this.currentToken = null;
      this.tokenExpiresAt = 0;

      console.log('✅ Agora cleanup complete');
    } catch (error) {
      console.error('❌ Agora cleanup failed:', error);
    }
  }

  /**
   * Cleanup and destroy engine
   */
  async destroy(): Promise<void> {
    try {
      await this.leaveChannel(true);

      if (this.rtcEngine) {
        // For mock service, call its destroy method directly
        if (this.isUsingMockService) {
          try {
            if (typeof (this.rtcEngine as any).destroy === 'function') {
              await (this.rtcEngine as any).destroy();
            }
          } catch (mockError) {
            console.warn('⚠️ Error destroying mock service (non-critical):', mockError);
          }
        } else {
          // For real Agora SDK, remove listeners and destroy
          // Remove all listeners (only if method exists)
          if (typeof this.rtcEngine.removeAllListeners === 'function') {
            this.rtcEngine.removeAllListeners();
          }

          // Destroy the engine
          await RtcEngine.destroy();
        }
        this.rtcEngine = null;
      }

      // Reset state
      this.streamState.isConnected = false;
      this.streamState.participants.clear();
      this.currentToken = null;
      this.tokenExpiresAt = 0;
      this.eventCallbacks = {};

      console.log('✅ Agora service destroyed');

    } catch (error: any) {
      console.error('❌ Failed to destroy Agora service:', error);
    }
  }

  /**
   * Handle app lifecycle changes
   */
  async handleAppStateChange(nextAppState: string): Promise<void> {
    try {
      if (!this.rtcEngine || !this.streamState.isJoined) return;

      if (nextAppState === 'background') {
        console.log('📱 App going to background - pausing audio');
        // Optionally mute audio when app goes to background
        // await this.muteLocalAudio(true);
      } else if (nextAppState === 'active') {
        console.log('📱 App becoming active - resuming audio');
        // Resume audio when app becomes active
        // await this.muteLocalAudio(false);
      }

    } catch (error: any) {
      console.error('❌ Failed to handle app state change:', error);
    }
  }

  /**
   * Get connection quality statistics
   */
  async getConnectionStats(): Promise<any> {
    try {
      if (!this.rtcEngine) return null;

      // Note: This would require implementing RTC stats collection
      // For now, return basic connection info
      return {
        connectionState: this.streamState.connectionState,
        isConnected: this.streamState.isConnected,
        isJoined: this.streamState.isJoined,
        participantCount: this.streamState.participants.size,
        tokenExpiresAt: this.tokenExpiresAt
      };

    } catch (error: any) {
      console.error('❌ Failed to get connection stats:', error);
      return null;
    }
  }
}

export const agoraService = AgoraService.getInstance();
