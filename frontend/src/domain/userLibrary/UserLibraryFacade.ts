import type {
  UserLibraryAdapter,
  UserLibraryCursor,
  UserLibraryPage,
  UserPlaylist,
  UserTrack,
  UserLibraryPlatform,
} from './UserLibraryAdapter'
import { resolveUserLibraryAdapter, resolveUserLibraryPlatform } from './UserLibraryResolver'

export const PLAYLISTS_PAGE_SIZE = 20
export const TRACKS_PAGE_SIZE = 50

export interface UserLibraryPageState<T> {
  items: T[]
  cursor: UserLibraryCursor
  hasMore: boolean
  isLoading: boolean
  error: string | null
}

const createPageState = <T>(): UserLibraryPageState<T> => ({
  items: [],
  cursor: null,
  hasMore: true,
  isLoading: false,
  error: null,
})

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'Unexpected error while loading your library.'
}

export class UserLibraryFacade {
  private adapter: UserLibraryAdapter | null = null
  private platform: UserLibraryPlatform | null = null
  private playlistsState: UserLibraryPageState<UserPlaylist> = createPageState<UserPlaylist>()
  private tracksState = new Map<string, UserLibraryPageState<UserTrack>>()

  private ensurePlatform(): void {
    const current = resolveUserLibraryPlatform()
    if (this.platform && this.platform !== current) {
      this.adapter = null
      this.playlistsState = createPageState<UserPlaylist>()
      this.tracksState.clear()
    }
    this.platform = current
  }

  private getAdapter(): UserLibraryAdapter {
    this.ensurePlatform()
    if (!this.adapter) {
      this.adapter = resolveUserLibraryAdapter()
    }
    return this.adapter
  }

  getPlaylistsState(): UserLibraryPageState<UserPlaylist> {
    this.ensurePlatform()
    console.log('[UserLibrary] Get playlists state', {
      items: this.playlistsState.items.length,
      cursor: this.playlistsState.cursor,
      hasMore: this.playlistsState.hasMore,
      isLoading: this.playlistsState.isLoading,
    })
    return this.playlistsState
  }

  getPlaylistTracksState(playlistId: string): UserLibraryPageState<UserTrack> {
    this.ensurePlatform()
    console.log('[UserLibrary] Get tracks state', { playlistId })
    return this.ensureTracksState(playlistId)
  }

  async loadNextPlaylistsPage(): Promise<UserLibraryPageState<UserPlaylist>> {
    this.ensurePlatform()
    if (this.playlistsState.isLoading || !this.playlistsState.hasMore) {
      return this.playlistsState
    }

    console.log('[UserLibrary] Fetch playlists page', {
      cursor: this.playlistsState.cursor,
      limit: PLAYLISTS_PAGE_SIZE,
    })

    this.playlistsState.isLoading = true
    this.playlistsState.error = null

    try {
      const page = await this.getAdapter().getPlaylists({
        limit: PLAYLISTS_PAGE_SIZE,
        cursor: this.playlistsState.cursor,
      })
      this.playlistsState = this.mergePage(this.playlistsState, page)
      console.log('[UserLibrary] Playlists page loaded', {
        items: page.items.length,
        total: this.playlistsState.items.length,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      })
    } catch (error) {
      this.playlistsState.error = toErrorMessage(error)
      console.log('[UserLibrary] Playlists page error', this.playlistsState.error)
    } finally {
      this.playlistsState.isLoading = false
    }

    return this.playlistsState
  }

  async loadNextPlaylistTracksPage(playlistId: string): Promise<UserLibraryPageState<UserTrack>> {
    this.ensurePlatform()
    const state = this.ensureTracksState(playlistId)

    if (state.isLoading || !state.hasMore) {
      return state
    }

    console.log('[UserLibrary] Fetch tracks page', {
      playlistId,
      cursor: state.cursor,
      limit: TRACKS_PAGE_SIZE,
    })

    state.isLoading = true
    state.error = null

    try {
      const page = await this.getAdapter().getPlaylistTracks({
        playlistId,
        limit: TRACKS_PAGE_SIZE,
        cursor: state.cursor,
      })
      const nextState = this.mergePage(state, page)
      nextState.isLoading = false
      this.tracksState.set(playlistId, nextState)
      console.log('[UserLibrary] Tracks page loaded', {
        playlistId,
        items: page.items.length,
        total: nextState.items.length,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      })
    } catch (error) {
      state.error = toErrorMessage(error)
      console.log('[UserLibrary] Tracks page error', { playlistId, error: state.error })
    } finally {
      const current = this.tracksState.get(playlistId)
      if (current) {
        current.isLoading = false
      }
    }

    return this.ensureTracksState(playlistId)
  }

  async loadAllPlaylistTracks(playlistId: string): Promise<UserTrack[]> {
    this.ensurePlatform()
    let state = this.ensureTracksState(playlistId)
    let safety = 0

    while (state.hasMore) {
      const before = state.items.length
      state = await this.loadNextPlaylistTracksPage(playlistId)
      if (state.items.length === before) {
        break
      }
      safety += 1
      if (safety > 200) {
        console.log('[UserLibrary] loadAllPlaylistTracks aborted (too many pages)')
        break
      }
    }

    return state.items
  }

  private mergePage<T>(state: UserLibraryPageState<T>, page: UserLibraryPage<T>): UserLibraryPageState<T> {
    return {
      ...state,
      items: [...state.items, ...page.items],
      cursor: page.nextCursor,
      hasMore: page.hasMore,
    }
  }

  private ensureTracksState(playlistId: string): UserLibraryPageState<UserTrack> {
    const existing = this.tracksState.get(playlistId)
    if (existing) {
      return existing
    }
    console.log('[UserLibrary] Create tracks state', { playlistId })
    const initial = createPageState<UserTrack>()
    this.tracksState.set(playlistId, initial)
    return initial
  }
}

export const userLibraryFacade = new UserLibraryFacade()
