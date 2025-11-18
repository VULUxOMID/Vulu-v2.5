import { AppStateStatus } from 'react-native'

export interface AppLifecycleCallbacks {
  onAppStateChange?: (nextAppState: AppStateStatus) => void
  onStreamInterrupted?: () => void
  onStreamResumed?: () => void
  onBackgroundTransition?: () => void
  onForegroundTransition?: () => void
}

type Stats = {
  lastState: AppStateStatus
  streamActive: boolean
}

class AppLifecycleService {
  private callbacks: AppLifecycleCallbacks = {}
  private lastState: AppStateStatus = 'active'
  private streamActive = false

  setCallbacks(cb: AppLifecycleCallbacks) {
    this.callbacks = cb || {}
  }

  getCurrentAppState(): AppStateStatus {
    return this.lastState
  }

  isInBackground(): boolean {
    return this.lastState === 'background'
  }

  isActive(): boolean {
    return this.lastState === 'active'
  }

  setStreamActive(active: boolean) {
    this.streamActive = active
  }

  handleAudioInterruption(type: 'began' | 'ended') {
    if (type === 'began') {
      this.callbacks.onStreamInterrupted?.()
    } else {
      this.callbacks.onStreamResumed?.()
    }
  }

  handleNetworkStateChange(_isConnected: boolean) {}

  handleMemoryWarning() {}

  getStats(): Stats {
    return { lastState: this.lastState, streamActive: this.streamActive }
  }
}

export const appLifecycleService = new AppLifecycleService()