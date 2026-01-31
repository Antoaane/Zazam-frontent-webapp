import type { PlaybackCapabilities } from './PlaybackCapabilities'

export type PlaybackPlatform = 'spotify' | 'deezer' | 'apple_music' | 'tidal'

export interface PlaybackTrack {
  id: string
  title: string
  artist: string
  album?: string
  coverUrl: string
  durationMs?: number
}

export interface PlaybackState {
  isReady: boolean
  isConnected: boolean
  isPlaying: boolean
  positionMs: number
  durationMs: number
  track: PlaybackTrack | null
  deviceId: string | null
}

export type PlaybackStateListener = (state: PlaybackState) => void

export interface PlaybackAdapter {
  platform: PlaybackPlatform
  capabilities: PlaybackCapabilities
  getState(): PlaybackState
  connect(): Promise<void>
  disconnect(): Promise<void>
  play(): Promise<void>
  pause(): Promise<void>
  togglePlay(): Promise<void>
  seek(positionMs: number): Promise<void>
  onStateChange(listener: PlaybackStateListener): () => void
}
