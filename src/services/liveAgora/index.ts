export type Role = 'host' | 'audience'

export type LiveEvents = {
  onJoinSuccess?: (channel: string, uid: number) => void
  onConnectionChange?: (connected: boolean) => void
  onConnectionEvent?: (state: number, reason: number) => void
  onUserJoined?: (uid: number) => void
  onUserOffline?: (uid: number) => void
  onError?: (code: number) => void
}

export { liveAgora } from './liveAgora'