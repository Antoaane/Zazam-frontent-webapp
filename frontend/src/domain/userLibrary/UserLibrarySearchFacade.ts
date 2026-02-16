import type { UserLibraryCursor, UserLibraryPage, UserTrack } from './UserLibraryAdapter'
import type { UserLibrarySearchAdapter } from './UserLibrarySearchAdapter'
import { resolveUserLibrarySearchAdapter } from './UserLibrarySearchResolver'
import { resolveUserLibraryPlatform } from './UserLibraryResolver'
import type { UserLibraryPlatform } from './UserLibraryAdapter'

export const SEARCH_PAGE_SIZE = 50

export interface UserLibrarySearchState {
  query: string
  items: UserTrack[]
  cursor: UserLibraryCursor
  hasMore: boolean
  isLoading: boolean
  error: string | null
}

const createState = (query = ''): UserLibrarySearchState => ({
  query,
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
  return 'Unexpected error while searching your library.'
}

export class UserLibrarySearchFacade {
  private adapter: UserLibrarySearchAdapter | null = null
  private platform: UserLibraryPlatform | null = null
  private state: UserLibrarySearchState = createState()

  private ensurePlatform(): void {
    const current = resolveUserLibraryPlatform()
    if (this.platform && this.platform !== current) {
      this.adapter = null
      this.state = createState()
    }
    this.platform = current
  }

  private getAdapter(): UserLibrarySearchAdapter {
    this.ensurePlatform()
    if (!this.adapter) {
      this.adapter = resolveUserLibrarySearchAdapter()
    }
    return this.adapter
  }

  getState(): UserLibrarySearchState {
    this.ensurePlatform()
    console.log('[UserLibrary] Get search state', {
      query: this.state.query,
      items: this.state.items.length,
      cursor: this.state.cursor,
      hasMore: this.state.hasMore,
      isLoading: this.state.isLoading,
    })
    return this.state
  }

  reset(): void {
    this.state = createState()
  }

  async search(query: string): Promise<UserLibrarySearchState> {
    this.ensurePlatform()
    const trimmed = query.trim()
    if (!trimmed) {
      this.state = createState()
      return this.state
    }

    if (this.state.query !== trimmed) {
      this.state = createState(trimmed)
    }

    return this.loadNextPage()
  }

  async loadNextPage(): Promise<UserLibrarySearchState> {
    this.ensurePlatform()
    if (this.state.isLoading || !this.state.hasMore) {
      return this.state
    }

    if (!this.state.query) {
      return this.state
    }

    console.log('[UserLibrary] Fetch search page', {
      query: this.state.query,
      cursor: this.state.cursor,
      limit: SEARCH_PAGE_SIZE,
    })

    this.state.isLoading = true
    this.state.error = null

    try {
      const page: UserLibraryPage<UserTrack> = await this.getAdapter().searchTracks({
        query: this.state.query,
        limit: SEARCH_PAGE_SIZE,
        cursor: this.state.cursor,
      })

      this.state = {
        ...this.state,
        items: [...this.state.items, ...page.items],
        cursor: page.nextCursor,
        hasMore: page.hasMore,
        isLoading: false,
      }

      console.log('[UserLibrary] Search page loaded', {
        query: this.state.query,
        items: page.items.length,
        total: this.state.items.length,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      })
    } catch (error) {
      this.state.error = toErrorMessage(error)
      console.log('[UserLibrary] Search page error', this.state.error)
    } finally {
      this.state.isLoading = false
    }

    return this.state
  }
}

export const userLibrarySearchFacade = new UserLibrarySearchFacade()
