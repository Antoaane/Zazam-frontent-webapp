import type { UserLibraryAdapter, UserLibraryCursor, UserLibraryPage, UserPlaylist, UserTrack } from './UserLibraryAdapter'
import { resolveUserLibraryAdapter } from './UserLibraryResolver'

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
  private playlistsState: UserLibraryPageState<UserPlaylist> = createPageState<UserPlaylist>()
  private tracksState = new Map<string, UserLibraryPageState<UserTrack>>()

  private getAdapter(): UserLibraryAdapter {
    if (!this.adapter) {
      this.adapter = resolveUserLibraryAdapter()
    }
    return this.adapter
  }

  getPlaylistsState(): UserLibraryPageState<UserPlaylist> {
    console.log('[UserLibrary] Get playlists state', {
      items: this.playlistsState.items.length,
      cursor: this.playlistsState.cursor,
      hasMore: this.playlistsState.hasMore,
      isLoading: this.playlistsState.isLoading,
    })
    return this.playlistsState
  }

  getPlaylistTracksState(playlistId: string): UserLibraryPageState<UserTrack> {
    console.log('[UserLibrary] Get tracks state', { playlistId })
    return this.ensureTracksState(playlistId)
  }

  async loadNextPlaylistsPage(): Promise<UserLibraryPageState<UserPlaylist>> {
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
      state.isLoading = false
    }

    return this.ensureTracksState(playlistId)
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
