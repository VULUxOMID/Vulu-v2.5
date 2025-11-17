/**
 * Agora Import Wrapper
 * Safely imports Agora SDK with fallback to mock service
 */

// Check if we're in Expo Go environment
// Expo Go doesn't support custom native modules like react-native-agora
// executionEnvironment === 'storeClient' means Expo Go
// executionEnvironment === 'bare' means bare React Native app (supports native modules)
const isExpoGo = 
  typeof global.Expo !== 'undefined' && 
  global.Expo.Constants?.executionEnvironment === 'storeClient';

// Mock implementations for when Agora SDK is not available
const mockAgoraExports = {
  default: null,
  RtcEngine: null,
  RtcEngineEvents: {},
  ChannelProfile: {
    Communication: 0,
    LiveBroadcasting: 1
  },
  ClientRole: {
    Broadcaster: 1,
    Audience: 2
  },
  AudioProfile: {
    Default: 0,
    SpeechStandard: 1,
    MusicStandard: 2,
    MusicStandardStereo: 3,
    MusicHighQuality: 4,
    MusicHighQualityStereo: 5
  },
  AudioScenario: {
    Default: 0,
    ChatRoomEntertainment: 1,
    Education: 2,
    GameStreaming: 3,
    ShowRoom: 4,
    ChatRoomGaming: 5
  },
  VideoEncoderConfiguration: {},
  ConnectionStateType: {
    Disconnected: 1,
    Connecting: 2,
    Connected: 3,
    Reconnecting: 4,
    Failed: 5
  },
  ConnectionChangedReason: {
    Connecting: 0,
    JoinSuccess: 1,
    Interrupted: 2,
    BannedByServer: 3,
    JoinFailed: 4,
    LeaveChannel: 5,
    InvalidAppId: 6,
    InvalidChannelName: 7,
    InvalidToken: 8,
    TokenExpired: 9,
    RejectedByServer: 10,
    SettingProxyServer: 11,
    RenewToken: 12,
    ClientIpAddressChanged: 13,
    KeepAliveTimeout: 14
  },
  UserOfflineReason: {
    Quit: 0,
    Dropped: 1,
    BecomeAudience: 2
  },
  ErrorCode: {
    NoError: 0,
    Failed: 1,
    InvalidArgument: 2,
    NotReady: 3,
    NotSupported: 4,
    Refused: 5,
    BufferTooSmall: 6,
    NotInitialized: 7,
    InvalidState: 10,
    NoPermission: 11,
    TimedOut: 12,
    Canceled: 13,
    TooOften: 14,
    BindSocket: 15,
    NetDown: 16,
    NetNobufs: 17,
    JoinChannelRejected: 18,
    LeaveChannelRejected: 19,
    AlreadyInUse: 20,
    InvalidAppId: 101,
    InvalidChannelName: 102,
    NoServerResources: 103,
    TokenExpired: 109,
    InvalidToken: 110,
    ConnectionInterrupted: 111,
    ConnectionLost: 112,
    NotInChannel: 113,
    SizeTooLarge: 114,
    BitrateLimit: 115,
    TooManyDataStreams: 116,
    StreamMessageTimeout: 117,
    SetClientRoleNotAuthorized: 119,
    DecryptionFailed: 120,
    InvalidUserId: 121,
    ClientIsRecording: 1025
  },
  WarningCode: {
    InvalidView: 8,
    InitVideo: 16,
    Pending: 20,
    NoAvailableChannel: 103,
    LookupChannelTimeout: 104,
    LookupChannelRejected: 105,
    OpenChannelTimeout: 106,
    OpenChannelRejected: 107,
    SwitchLiveVideoTimeout: 111,
    SetClientRoleTimeout: 118,
    SetClientRoleNotAuthorized: 119,
    OpenChannelInvalidTicket: 121,
    OpenChannelTryNextVos: 122,
    AudioMixingOpenError: 701,
    AdmRuntimePlayoutWarning: 1014,
    AdmRuntimeRecordingWarning: 1016,
    AdmRecordAudioSilence: 1019,
    AdmPlaybackMalfunction: 1020,
    AdmRecordMalfunction: 1021,
    AdmInterruption: 1025,
    AdmCategoryNotPlayAndRecord: 1029,
    AdmRecordAudioLowlevel: 1031,
    AdmPlayoutAudioLowlevel: 1032,
    AdmRecordIsOccupied: 1033,
    AdmNoDataReadyCallback: 1040,
    AdmInconsistentDevices: 1042,
    ApmHowling: 1051,
    AdmGlitchState: 1052,
    AdmImproperSettings: 1053
  }
};

// Safe import function
let agoraExports: any = mockAgoraExports;
let usingRealSDK = false;

// Try to import the real Agora SDK
// Only skip if we're definitely in Expo Go (which doesn't support native modules)
// In bare React Native apps (executionEnvironment === 'bare'), native modules are available
console.log('🔍 Environment check:', {
  hasExpo: typeof global.Expo !== 'undefined',
  executionEnvironment: typeof global.Expo !== 'undefined' ? global.Expo.Constants?.executionEnvironment : 'N/A',
  isExpoGo
});

if (!isExpoGo) {
  try {
    console.log('🔍 Attempting to import react-native-agora native module...');
    // Try to require the real Agora SDK
    const agoraModule = require('react-native-agora');
    
    // Debug: Log what we actually got from the module
    if (agoraModule) {
      console.log('✅ Agora module loaded successfully!');
      console.log('🔍 Agora module loaded, checking exports...');
      console.log('🔍 Module keys:', Object.keys(agoraModule).slice(0, 20).join(', '));
      
      // react-native-agora v4.5.3 uses createAgoraRtcEngine() instead of RtcEngine.create()
      const createAgoraRtcEngine = agoraModule.createAgoraRtcEngine;
      
      // Check if createAgoraRtcEngine is available (new API)
      if (createAgoraRtcEngine && typeof createAgoraRtcEngine === 'function') {
        console.log('✅ Found createAgoraRtcEngine function (v4.5.3+ API)');
        
        // Create a wrapper object that provides RtcEngine.create() for backward compatibility
        // This allows our code to use RtcEngine.create() while using the new API internally
        const RtcEngineWrapper = {
          create: createAgoraRtcEngine,
          destroy: agoraModule.destroy || (() => Promise.resolve())
        };
        
        // Use the module but add our RtcEngine wrapper
        agoraExports = {
          ...agoraModule,
          RtcEngine: RtcEngineWrapper
        };
        usingRealSDK = true;
        console.log('✅ Real Agora SDK imported and verified successfully');
        console.log('✅ Using createAgoraRtcEngine API (v4.5.3+)');
      } else if (agoraModule.RtcEngine && typeof agoraModule.RtcEngine.create === 'function') {
        // Fallback: Check for old API (RtcEngine.create)
        console.log('✅ Found RtcEngine.create (legacy API)');
        agoraExports = agoraModule;
        usingRealSDK = true;
        console.log('✅ Real Agora SDK imported and verified successfully');
      } else {
        console.warn('⚠️ Agora SDK module found but neither createAgoraRtcEngine nor RtcEngine.create is available');
        console.warn('⚠️ Available functions:', Object.keys(agoraModule).filter(k => typeof agoraModule[k] === 'function').join(', '));
        console.warn('⚠️ Falling back to mock - native module may not be properly linked');
        agoraExports = mockAgoraExports;
      }
    } else {
      console.warn('⚠️ Agora module is null or undefined');
      agoraExports = mockAgoraExports;
    }
  } catch (error: any) {
    // Module not found or not linked - this is expected in Expo Go or if native modules aren't built
    if (error.code === 'MODULE_NOT_FOUND' || error.message?.includes('Cannot find module')) {
      console.log('🎭 Agora SDK native module not found - using mock (this is normal in Expo Go or before native build)');
    } else {
      console.warn('⚠️ Error importing Agora SDK, using mock:', error.message);
      console.warn('⚠️ Error details:', error);
    }
    agoraExports = mockAgoraExports;
  }
} else {
  console.log('🎭 Expo Go detected - using mock Agora exports (native modules not supported in Expo Go)');
}

// Helper function to normalize enum values (handles both old and new API)
const normalizeEnum = (oldEnum: any, newEnum: any, mockEnum: any) => {
  if (newEnum) {
    // New API - return as-is, it should have the same structure
    return newEnum;
  }
  return oldEnum || mockEnum;
};

// Export all Agora types and classes
// Handle both old API (ChannelProfile, ClientRole) and new API (ChannelProfileType, ClientRoleType)
export default agoraExports.default;
export const RtcEngine = agoraExports.RtcEngine;
export const RtcEngineEvents = agoraExports.RtcEngineEvents || agoraExports.RtcEngineEventType || {};
export const ChannelProfile = normalizeEnum(
  agoraExports.ChannelProfile,
  agoraExports.ChannelProfileType,
  mockAgoraExports.ChannelProfile
);
export const ClientRole = normalizeEnum(
  agoraExports.ClientRole,
  agoraExports.ClientRoleType,
  mockAgoraExports.ClientRole
);
export const AudioProfile = normalizeEnum(
  agoraExports.AudioProfile,
  agoraExports.AudioProfileType,
  mockAgoraExports.AudioProfile
);
export const AudioScenario = normalizeEnum(
  agoraExports.AudioScenario,
  agoraExports.AudioScenarioType,
  mockAgoraExports.AudioScenario
);
export const VideoEncoderConfiguration = agoraExports.VideoEncoderConfiguration || mockAgoraExports.VideoEncoderConfiguration;
export const ConnectionStateType = agoraExports.ConnectionStateType || mockAgoraExports.ConnectionStateType;
export const ConnectionChangedReason = agoraExports.ConnectionChangedReason || agoraExports.ConnectionChangedReasonType || mockAgoraExports.ConnectionChangedReason;
export const UserOfflineReason = agoraExports.UserOfflineReason || agoraExports.UserOfflineReasonType || mockAgoraExports.UserOfflineReason;
export const ErrorCode = agoraExports.ErrorCode || agoraExports.ErrorCodeType || mockAgoraExports.ErrorCode;
export const WarningCode = agoraExports.WarningCode || agoraExports.WarnCodeType || mockAgoraExports.WarningCode;

// Export utility functions
export const isAgoraAvailable = () => usingRealSDK && agoraExports.RtcEngine !== null && agoraExports.RtcEngine !== undefined;
export const isUsingMockAgora = () => !usingRealSDK;

// Log the current state
console.log(`🔧 Agora Import Wrapper: ${isUsingMockAgora() ? 'Using Mock' : 'Using Real SDK'}`);
