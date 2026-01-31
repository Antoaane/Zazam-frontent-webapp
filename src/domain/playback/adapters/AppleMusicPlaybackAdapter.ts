import type { PlaybackAdapter } from '../PlaybackAdapter'
import type { PlaybackCapabilities } from '../PlaybackCapabilities'

const capabilities: PlaybackCapabilities = {
  canPlayPause: false,
  canSeek: false,
  canSkip: false,
  supportsTransfer: false,
  supportsRemoteControl: false,
  supportsSync: false,
  requiresPremium: false,
}

const notImplemented = async (): Promise<never> => {
  throw new Error('Apple Music playback is not available yet.')
}

export const appleMusicPlaybackAdapter: PlaybackAdapter = {
  platform: 'apple_music',
  capabilities,
  getState() {
    return {
      isReady: false,
      isConnected: false,
      isPlaying: false,
      positionMs: 0,
      durationMs: 0,
      track: null,
      deviceId: null,
    }
  },
  connect: notImplemented,
  disconnect: notImplemented,
  play: notImplemented,
  pause: notImplemented,
  togglePlay: notImplemented,
  seek: notImplemented,
  onStateChange() {
    return () => undefined
  },
}
