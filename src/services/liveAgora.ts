import { createAgoraRtcEngine, ChannelProfileType, ClientRoleType } from 'react-native-agora'

type Role = 'host' | 'audience'

export type LiveEvents = {
  onJoinSuccess?: (channel: string, uid: number) => void
  onConnectionChange?: (connected: boolean) => void
  onUserJoined?: (uid: number) => void
  onUserOffline?: (uid: number) => void
  onError?: (code: number) => void
}

class LiveAgora {
  private engine: any | null = null
  private initialized = false
  private events: LiveEvents = {}

  setEvents(events: LiveEvents) {
    this.events = events
  }

  async initialize(appId: string) {
    if (this.initialized) return
    this.engine = createAgoraRtcEngine()
    await this.engine.initialize({ appId })
    await this.engine.setChannelProfile(ChannelProfileType.ChannelProfileLiveBroadcasting)
    this.registerEvents()
    this.initialized = true
  }

  private registerEvents() {
    const handler = {
      onJoinChannelSuccess: (channel: string, uid: number) => {
        this.events.onJoinSuccess?.(channel, uid)
        this.events.onConnectionChange?.(true)
      },
      onConnectionStateChanged: (_state: number, _reason: number) => {
        const connected = _state === 3
        this.events.onConnectionChange?.(connected)
      },
      onUserJoined: (uid: number) => {
        this.events.onUserJoined?.(uid)
      },
      onUserOffline: (uid: number) => {
        this.events.onUserOffline?.(uid)
      },
      onError: (err: number) => {
        this.events.onError?.(err)
      }
    }
    if (typeof this.engine.registerEventHandler === 'function') {
      this.engine.registerEventHandler(handler)
    } else if (typeof this.engine.addListener === 'function') {
      this.engine.addListener('JoinChannelSuccess', handler.onJoinChannelSuccess)
      this.engine.addListener('ConnectionStateChanged', handler.onConnectionStateChanged)
      this.engine.addListener('UserJoined', handler.onUserJoined)
      this.engine.addListener('UserOffline', handler.onUserOffline)
      this.engine.addListener('Error', handler.onError)
    }
  }

  async join(channel: string, uid: number, role: Role, token: string) {
    const clientRole = role === 'host' ? ClientRoleType.ClientRoleBroadcaster : ClientRoleType.ClientRoleAudience
    await this.engine.setClientRole(clientRole)
    const res = await this.engine.joinChannel(token, channel, uid, { publishMicrophoneTrack: role === 'host' })
    return res
  }

  async leave() {
    if (!this.engine) return
    await this.engine.leaveChannel()
  }

  async destroy() {
    if (!this.engine) return
    try {
      await this.leave()
    } catch {}
    try {
      if (typeof this.engine.unregisterEventHandler === 'function') {
        this.engine.unregisterEventHandler()
      }
    } catch {}
    this.engine.release?.()
    this.engine = null
    this.initialized = false
  }
}

export const liveAgora = new LiveAgora()