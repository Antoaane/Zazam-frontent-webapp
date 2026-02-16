export type QueueMode = 'host' | 'guest'

export interface QueueTrack {
  id: string
  uri?: string
  title: string
  artist: string
  coverUrl: string
  durationMs?: number
}

export interface QueueSnapshot {
  mode: QueueMode
  items: QueueTrack[]
  currentIndex: number
  updatedAt: number
  lastPlayedTrackId?: string | null
  lastPlayedPositionMs?: number
}
