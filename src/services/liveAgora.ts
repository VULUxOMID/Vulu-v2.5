import { createAgoraRtcEngine, ChannelProfileType, ClientRoleType } from 'react-native-agora'

type Role = 'host' | 'audience'

export type LiveEvents = {
  onJoinSuccess?: (channel: string, uid: number) => void
  onConnectionChange?: (connected: boolean) => void
  onConnectionEvent?: (state: number, reason: number) => void
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
      onJoinChannelSuccess: (arg1: any, arg2?: any) => {
        let channel: string
        let uid: number
        if (arg1 && typeof arg1 === 'object' && arg1.channelId) {
          channel = arg1.channelId
          uid = arg1.localUid
        } else {
          channel = arg1 as string
          uid = (arg2 as number) ?? 0
        }
        this.events.onJoinSuccess?.(channel, uid)
        this.events.onConnectionChange?.(true)
      },
      onConnectionStateChanged: (arg1: any, arg2?: any) => {
        let state: number | undefined
        let reason: number | undefined
        if (arg1 && typeof arg1 === 'object' && 'state' in arg1) {
          const st = (arg1 as any).state
          const rs = (arg1 as any).reason
          state = typeof st === 'number' ? st : (typeof st === 'string' ? Number(st) : undefined)
          reason = typeof rs === 'number' ? rs : (typeof rs === 'string' ? Number(rs) : undefined)
        } else {
          const st = arg1
          const rs = arg2
          state = typeof st === 'number' ? st : (typeof st === 'string' ? Number(st) : undefined)
          reason = typeof rs === 'number' ? rs : (typeof rs === 'string' ? Number(rs) : undefined)
        }
        if (typeof state === 'number') {
          const connected = state === 3
          this.events.onConnectionChange?.(connected)
        }
        if (typeof state === 'number' || typeof reason === 'number') {
          this.events.onConnectionEvent?.(state ?? 0, reason ?? 0)
        }
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
    await this.engine.enableAudio?.()
    if (typeof this.engine.setDefaultAudioRouteToSpeaker === 'function') {
      await this.engine.setDefaultAudioRouteToSpeaker(true)
    }
    if (typeof this.engine.enableLocalAudio === 'function') {
      await this.engine.enableLocalAudio(true)
    }
    await this.engine.setClientRole(clientRole)
    const res = await this.engine.joinChannel(token, channel, uid)
    return res
  }

  async leave() {
    if (!this.engine) return
    await this.engine.leaveChannel()
  }

  async renewToken(token: string) {
    if (!this.engine) return
    if (typeof this.engine.renewToken === 'function') {
      await this.engine.renewToken(token)
    }
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