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

const logUnsupported = (action: string) => {
  console.log('[TIDAL Playback] Unsupported action', { action })
}

export const tidalPlaybackAdapter: PlaybackAdapter = {
  platform: 'tidal',
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
  async connect() {
    logUnsupported('connect')
  },
  async disconnect() {
    logUnsupported('disconnect')
  },
  async play() {
    logUnsupported('play')
  },
  async pause() {
    logUnsupported('pause')
  },
  async togglePlay() {
    logUnsupported('togglePlay')
  },
  async playTrack() {
    logUnsupported('playTrack')
  },
  async seek() {
    logUnsupported('seek')
  },
  onStateChange() {
    return () => undefined
  },
}
