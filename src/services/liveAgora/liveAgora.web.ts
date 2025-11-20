import { Platform } from 'react-native';

export type Role = 'host' | 'audience';

export type LiveEvents = {
  onJoinSuccess?: (channel: string, uid: number) => void;
  onConnectionChange?: (connected: boolean) => void;
  onConnectionEvent?: (state: number, reason: number) => void;
  onUserJoined?: (uid: number) => void;
  onUserOffline?: (uid: number) => void;
  onError?: (code: number) => void;
};

class LiveAgora {
  private events: LiveEvents = {};
  private joinedChannelId: string | null = null;
  private initialized = false;

  constructor() {
    console.warn('LiveAgora: Running in web mock mode - live streaming functionality is limited');
  }

  setEvents(events: LiveEvents) {
    this.events = events;
  }

  async initialize(appId: string) {
    if (this.initialized) return;
    console.log('LiveAgora Web: Initializing with appId', appId);
    this.initialized = true;
  }

  async join(channel: string, uid: number, role: Role, token: string) {
    console.log('LiveAgora Web: Joining channel', channel, 'as', role);
    this.joinedChannelId = channel;
    
    // Simulate successful join
    setTimeout(() => {
      this.events.onJoinSuccess?.(channel, uid);
      this.events.onConnectionChange?.(true);
    }, 500);
    
    return 0;
  }

  async leave() {
    console.log('LiveAgora Web: Leaving channel');
    this.joinedChannelId = null;
    this.events.onConnectionChange?.(false);
  }

  async renewToken(token: string) {
    console.log('LiveAgora Web: Renewing token');
  }

  async destroy() {
    console.log('LiveAgora Web: Destroying instance');
    this.initialized = false;
    this.joinedChannelId = null;
  }

  async setMute(muted: boolean) {
    console.log('LiveAgora Web: Setting mute to', muted);
  }

  isJoined() {
    return !!this.joinedChannelId;
  }

  getJoinedChannelId() {
    return this.joinedChannelId;
  }
}

export const liveAgora = new LiveAgora();