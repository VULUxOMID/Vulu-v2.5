import { Platform } from 'react-native'

export type Role = 'host' | 'audience'

export type LiveEvents = {
  onJoinSuccess?: (channel: string, uid: number) => void
  onConnectionChange?: (connected: boolean) => void
  onConnectionEvent?: (state: number, reason: number) => void
  onUserJoined?: (uid: number) => void
  onUserOffline?: (uid: number) => void
  onError?: (code: number) => void
}

// Platform-specific implementation
let agoraInstance: any

if (Platform.OS === 'web') {
  // Use web mock implementation
  agoraInstance = require('./liveAgora.web').liveAgora
} else {
  // Use native implementation
  agoraInstance = require('./liveAgora.native').liveAgora
}

export const liveAgora = agoraInstance