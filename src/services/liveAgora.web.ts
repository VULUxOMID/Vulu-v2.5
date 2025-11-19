// Web-compatible stub for Agora functionality
// Since Agora SDK doesn't work on web, we'll create a mock implementation

export type Role = 'host' | 'audience'

export type LiveEvents = {
  onJoinSuccess?: (channel: string, uid: number) => void
  onConnectionChange?: (connected: boolean) => void
  onConnectionEvent?: (state: number, reason: number) => void
  onUserJoined?: (uid: number) => void
  onUserOffline?: (uid: number) => void
  onError?: (code: number) => void
}

class LiveAgora {
  private initialized = false
  private events: LiveEvents = {}
  private joinedChannelId: string | null = null
  private mockConnectionTimer: NodeJS.Timeout | null = null

  setEvents(events: LiveEvents) {
    this.events = events
  }

  async initialize(appId: string) {
    if (this.initialized) return
    
    // Mock initialization for web
    console.warn('Agora SDK is not supported on web. Using mock implementation.')
    this.initialized = true
  }

  async join(channel: string, uid: number, role: Role, token: string) {
    if (!this.initialized) {
      throw new Error('Agora engine not initialized')
    }

    // Mock join behavior for web
    this.joinedChannelId = channel
    
    // Simulate connection success after a short delay
    this.mockConnectionTimer = setTimeout(() => {
      this.events.onJoinSuccess?.(channel, uid)
      this.events.onConnectionChange?.(true)
    }, 1000)

    return 0
  }

  async leave() {
    if (this.mockConnectionTimer) {
      clearTimeout(this.mockConnectionTimer)
      this.mockConnectionTimer = null
    }
    
    this.joinedChannelId = null
    this.events.onConnectionChange?.(false)
  }

  async renewToken(token: string) {
    // Mock token renewal for web
    console.warn('Token renewal not supported in web mock')
  }

  async destroy() {
    await this.leave()
    this.initialized = false
  }

  async setMute(muted: boolean) {
    // Mock mute functionality for web
    console.warn(`Mute setting: ${muted} (mock implementation)`)
  }

  isJoined() {
    return !!this.joinedChannelId
  }

  getJoinedChannelId() {
    return this.joinedChannelId
  }
}

export const liveAgora = new LiveAgora()