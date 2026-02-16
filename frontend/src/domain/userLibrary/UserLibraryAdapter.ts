export type UserLibraryCursor = string | null

export type UserLibraryPlatform = 'spotify' | 'deezer' | 'apple_music' | 'tidal'

export interface UserPlaylist {
  id: string
  title: string
  subtitle: string
  coverUrl: string
  tracksCount: number
}

export interface UserTrack {
  id: string
  title: string
  subtitle: string
  coverUrl: string
  uri?: string
  durationMs?: number
}

export interface UserLibraryPage<T> {
  items: T[]
  nextCursor: UserLibraryCursor
  hasMore: boolean
}

export interface UserLibraryAdapter {
  getPlaylists(request: { limit: number; cursor?: UserLibraryCursor }): Promise<UserLibraryPage<UserPlaylist>>
  getPlaylistTracks(request: {
    playlistId: string
    limit: number
    cursor?: UserLibraryCursor
  }): Promise<UserLibraryPage<UserTrack>>
}
