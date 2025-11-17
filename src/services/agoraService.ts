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
  private joinChannelPromise: { resolve: (value: boolean) => void; reject: (error: any) => void; timeout: NodeJS.Timeout } | null = null;
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

      if (this.rtcEngine) {
        console.log('✅ Agora RTC Engine already initialized');
        return true;
      }

      console.log('🔄 Initializing Agora RTC Engine...');

      // Create RTC Engine instance
      // For v4.5.3+, createAgoraRtcEngine may need a config object
      try {
        // Try with config object first (new API)
        this.rtcEngine = await RtcEngine.create({ appId: this.config.appId });
        console.log('✅ Engine created with config object');
      } catch (error) {
        // Fallback to string appId (old API)
        console.log('⚠️ Config object failed, trying string appId...');
        this.rtcEngine = await RtcEngine.create(this.config.appId);
        console.log('✅ Engine created with string appId');
      }

      // Wait for engine to be fully ready (some APIs may return -7 ERR_NOT_READY immediately after creation)
      // The engine needs time to initialize - 1 second should be sufficient
      console.log('⏳ Waiting for engine to be ready...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('✅ Engine ready delay completed');

      // Debug: Log available methods and enum values
      console.log('🔍 Engine methods:', Object.keys(this.rtcEngine).filter(k => typeof this.rtcEngine[k] === 'function').slice(0, 10).join(', '));
      console.log('🔍 ChannelProfile enum:', ChannelProfile);
      console.log('🔍 AudioProfile enum:', AudioProfile);
      console.log('🔍 AudioScenario enum:', AudioScenario);

      // In v4.5.3+, createAgoraRtcEngine already initializes the engine
      // Don't call initialize() - it's not needed and returns -2
      // The engine is ready to use after a brief delay

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
      console.log(`👤 User joined: ${uid}`);
      this.eventCallbacks.onUserJoined?.(uid, elapsed);
    });

    // User left channel
    this.rtcEngine.addListener('UserOffline', (uid: number, reason: UserOfflineReason) => {
      console.log(`👤 User offline: ${uid}, reason: ${reason}`);
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
      console.log(`🔗 Connection state changed: ${state}, reason: ${reason}`);
      this.streamState.connectionState = state;
      this.eventCallbacks.onConnectionStateChanged?.(state, reason);
    });

    // Join channel success
    this.rtcEngine.addListener('JoinChannelSuccess', async (channel: string, uid: number, elapsed: number) => {
      console.log(`✅ Successfully joined channel: ${channel} with UID: ${uid}`);
      this.streamState.isJoined = true;
      this.streamState.channelName = channel;
      this.streamState.localUid = uid;
      
      // Resolve the join promise if it exists
      if (this.joinChannelPromise) {
        clearTimeout(this.joinChannelPromise.timeout);
        this.joinChannelPromise.resolve(true);
        this.joinChannelPromise = null;
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
        clearTimeout(this.joinChannelPromise.timeout);
        this.joinChannelPromise.reject(new Error(errorMsg));
        this.joinChannelPromise = null;
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
      console.log(`🔊 Remote audio state changed for ${uid}: state=${state}, reason=${reason}`);
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
   * Internal method to attempt joining a channel with retries
   * Returns the result code from joinChannel call
   */
  private async attemptJoinChannel(token: string, channelName: string, uid: number): Promise<number> {
    const maxRetries = 5;
    let retryCount = 0;
    
    while (retryCount < maxRetries) {
      try {
        // New API: joinChannel(token, channelId, uid)
        const joinResult = await this.rtcEngine.joinChannel(token, channelName, uid);
        console.log(`✅ Joining channel initiated (new API): ${channelName} with UID: ${uid}, result: ${joinResult}`);
        
        // Check result code
        if (joinResult === 0) {
          // Success - join initiated
          return 0;
        } else if (joinResult === -7) {
          // ERR_NOT_READY - engine not ready yet, wait and retry
          retryCount++;
          if (retryCount < maxRetries) {
            // Exponential backoff: 500ms, 1000ms, 1500ms, 2000ms, 2500ms
            const waitTime = retryCount * 500;
            console.log(`⏳ Engine not ready (ERR_NOT_READY), waiting ${waitTime}ms before retry ${retryCount}/${maxRetries}...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            continue; // Retry
          } else {
            // Max retries reached - try old API as last resort
            console.log('⚠️ Max retries reached, trying old API format as last resort...');
            try {
              const oldResult = await this.rtcEngine.joinChannel(token, channelName, '', uid);
              console.log(`✅ Joining channel initiated (old API fallback): ${channelName} with UID: ${uid}, result: ${oldResult}`);
              return oldResult;
            } catch (oldError: any) {
              console.error('❌ Old API also failed:', oldError);
              return -7; // Return -7 to let the callback mechanism handle it
            }
          }
        } else if (joinResult === -2) {
          // ERR_INVALID_ARGUMENT - try old API format
          console.log('⚠️ New API returned ERR_INVALID_ARGUMENT, trying old API format...');
          try {
            const oldResult = await this.rtcEngine.joinChannel(token, channelName, '', uid);
            console.log(`✅ Joining channel initiated (old API): ${channelName} with UID: ${uid}, result: ${oldResult}`);
            return oldResult;
          } catch (oldError: any) {
            console.error('❌ Old API also failed:', oldError);
            throw new Error(`Invalid arguments to joinChannel: result=${joinResult}`);
          }
        } else {
          // Other error
          console.warn(`⚠️ joinChannel returned unexpected result: ${joinResult}`);
          throw new Error(`joinChannel failed with result: ${joinResult}`);
        }
      } catch (error: any) {
        // If it's not a retryable error, throw immediately
        if (error.message && error.message.includes('Invalid arguments')) {
          throw error;
        }
        // For other errors, try old API as fallback
        console.log('⚠️ New API failed, trying old API format...');
        try {
          const oldResult = await this.rtcEngine.joinChannel(token, channelName, '', uid);
          console.log(`✅ Joining channel initiated (old API): ${channelName} with UID: ${uid}, result: ${oldResult}`);
          return oldResult;
        } catch (oldError: any) {
          console.error('❌ Both API formats failed:', { newError: error, oldError });
          throw oldError;
        }
      }
    }
    
    // Should never reach here, but return -7 if we do
    return -7;
  }

  /**
   * Join a streaming channel with secure token authentication
   */
  async joinChannel(
    channelName: string,
    userId: string,
    isHost: boolean = false,
    providedToken?: string,
    validateAccess: boolean = true
  ): Promise<boolean> {
    try {
      // Validate stream access if requested (skip for hosts, they already have access)
      if (validateAccess && !isHost) {
        const hasAccess = await this.validateStreamAccess(channelName);
        if (!hasAccess) {
          // validateStreamAccess already allows access in dev mode, so if we get here in production, deny
          if (__DEV__) {
            // This shouldn't happen since validateStreamAccess allows in dev mode, but just in case
            console.warn('⚠️ Stream access validation returned false in dev mode - this is unexpected, but continuing anyway');
            // Continue anyway in dev mode
          } else {
            console.error('❌ Stream access denied');
            return false;
          }
        }
      }

      if (!this.streamState.isConnected) {
        const initialized = await this.initialize();
        if (!initialized) return false;
      }

      if (!this.rtcEngine) {
        console.error('❌ RTC Engine not initialized');
        return false;
      }

      console.log(`🔄 Joining channel: ${channelName} as ${isHost ? 'host' : 'audience'}`);

      // Store isHost flag for use in join success callback
      this.currentIsHost = isHost;

      // Generate UID from userId (consistent hash)
      const uid = this.generateUidFromUserId(userId);

      // Handle mock service differently
      if (this.isUsingMockService) {
        console.log('🎭 Using mock service to join channel');
        await this.rtcEngine.joinChannel('mock-token', channelName, uid, isHost);
        this.streamState.isJoined = true;
        this.streamState.channelName = channelName;
        this.streamState.localUid = uid;
        return true; // Mock service completes synchronously
      }

      // Set client role for real Agora SDK
      // Use numeric values: Broadcaster = 1, Audience = 2
      // From Agora SDK: ClientRoleBroadcaster = 1, ClientRoleAudience = 2
      let clientRole: number;
      if (isHost) {
        clientRole = typeof ClientRole?.ClientRoleBroadcaster === 'number'
          ? ClientRole.ClientRoleBroadcaster
          : (typeof ClientRole?.Broadcaster === 'number'
            ? ClientRole.Broadcaster
            : 1); // Default to 1 (Broadcaster)
      } else {
        clientRole = typeof ClientRole?.ClientRoleAudience === 'number'
          ? ClientRole.ClientRoleAudience
          : (typeof ClientRole?.Audience === 'number'
            ? ClientRole.Audience
            : 2); // Default to 2 (Audience)
      }
      console.log(`🔄 Setting client role to ${isHost ? 'Broadcaster' : 'Audience'}, numeric value:`, clientRole);
      const roleResult = await this.rtcEngine.setClientRole(clientRole);
      // -7 (ERR_NOT_READY) is non-critical - engine may not be fully ready yet but will be when joining
      // Native log shows result 0 (success), JS wrapper returns -7 from outdata, but this is OK
      if (roleResult === 0) {
        console.log('✅ Client role set successfully');
      } else if (roleResult === -7) {
        console.log('ℹ️ Client role set (engine not fully ready yet, will be ready when joining)');
      } else {
        console.warn('⚠️ setClientRole returned unexpected result:', roleResult);
      }
      
      // For audience members, ensure remote audio subscription is enabled
      // (In Live Broadcasting mode, this should be automatic, but we ensure it)
      if (!isHost) {
        try {
          if (typeof this.rtcEngine.muteAllRemoteAudioStreams === 'function') {
            await this.rtcEngine.muteAllRemoteAudioStreams(false);
            console.log('✅ Ensured remote audio subscription enabled for audience member');
          }
        } catch (error) {
          console.warn('⚠️ Failed to ensure remote audio subscription:', error);
        }
      }

      // Generate or use provided token
      let token = providedToken;
      if (!token || this.needsTokenRenewal()) {
        const tokenData = await this.generateToken(
          channelName,
          uid,
          isHost ? 'host' : 'audience'
        );
        token = tokenData.token;
      }

      // Join the channel
      // In v4.5.3+, the API signature changed
      // Try new API: joinChannel(token, channelId, uid) - 3 parameters
      
      // Wait additional time before attempting to join (engine may need more time after configuration)
      console.log('⏳ Waiting before join attempt to ensure engine is ready...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create a promise that will resolve when JoinChannelSuccess callback fires
      return new Promise<boolean>((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (this.joinChannelPromise) {
            this.joinChannelPromise = null;
          }
          console.error('❌ Join channel timeout - JoinChannelSuccess callback did not fire within 10 seconds');
          reject(new Error('Join channel timeout - callback did not fire'));
        }, 10000); // 10 second timeout
        
        this.joinChannelPromise = { resolve, reject, timeout };
        
        // Now attempt to join
        this.attemptJoinChannel(token, channelName, uid)
          .then((joinResult) => {
            // If joinResult is 0, the join was initiated successfully
            // We'll wait for the JoinChannelSuccess callback to resolve the promise
            if (joinResult === 0) {
              console.log('✅ Join channel call succeeded (result: 0) - waiting for JoinChannelSuccess callback...');
              // Don't resolve here - wait for callback
            } else if (joinResult === -7) {
              // ERR_NOT_READY - the join might still succeed, wait for callback
              console.log('⚠️ Join returned -7 (ERR_NOT_READY) - waiting for JoinChannelSuccess callback anyway...');
              // Don't resolve here - wait for callback (it might still fire)
            } else {
              // Other error - reject immediately
              clearTimeout(timeout);
              this.joinChannelPromise = null;
              reject(new Error(`joinChannel failed with result: ${joinResult}`));
            }
          })
          .catch((error) => {
            clearTimeout(timeout);
            this.joinChannelPromise = null;
            reject(error);
          });
      });

    } catch (error: any) {
      console.error('❌ Failed to join channel:', error);
      // Clean up promise if it exists
      if (this.joinChannelPromise) {
        clearTimeout(this.joinChannelPromise.timeout);
        this.joinChannelPromise = null;
      }
      return false;
    }
  }

  /**
   * Leave the current channel
   */
  async leaveChannel(): Promise<void> {
    try {
      if (!this.streamState.isJoined || !this.rtcEngine) return;

      console.log('🔄 Leaving channel...');

      // Handle mock service
      if (this.isUsingMockService) {
        console.log('🎭 Using mock service to leave channel');
        await this.rtcEngine.leaveChannel();
        this.streamState.isJoined = false;
        this.streamState.channelName = '';
        this.streamState.participants.clear();
        return;
      }

      // Leave the channel
      await this.rtcEngine.leaveChannel();

      // Reset state (will be updated by event listener)
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
    return Math.abs(hash) % 2147483647; // Ensure positive and within Agora's UID range
  }

  /**
   * Critical: Clean up Agora resources to prevent memory leaks
   */
  async cleanup(): Promise<void> {
    try {
      console.log('🧹 Cleaning up Agora resources...');

      // Leave channel if connected
      if (this.rtcEngine) {
        try {
          await this.rtcEngine.leaveChannel();
        } catch (leaveError) {
          console.warn('Error leaving channel:', leaveError);
        }

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
      if (this.streamState.isJoined) {
        await this.leaveChannel();
      }

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
