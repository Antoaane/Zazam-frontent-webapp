import type { UserLibraryCursor, UserLibraryPage, UserTrack } from './UserLibraryAdapter'
import type { UserLibraryLikesAdapter } from './UserLibraryLikesAdapter'
import { resolveUserLibraryLikesAdapter } from './UserLibraryLikesResolver'
import { resolveUserLibraryPlatform } from './UserLibraryResolver'
import type { UserLibraryPlatform } from './UserLibraryAdapter'

export const LIKES_PAGE_SIZE = 50

export interface UserLibraryLikesState {
  items: UserTrack[]
  cursor: UserLibraryCursor
  hasMore: boolean
  isLoading: boolean
  error: string | null
}

const createState = (): UserLibraryLikesState => ({
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
  return 'Unexpected error while loading your liked tracks.'
}

export class UserLibraryLikesFacade {
  private adapter: UserLibraryLikesAdapter | null = null
  private platform: UserLibraryPlatform | null = null
  private state: UserLibraryLikesState = createState()

  private ensurePlatform(): void {
    const current = resolveUserLibraryPlatform()
    if (this.platform && this.platform !== current) {
      this.adapter = null
      this.state = createState()
    }
    this.platform = current
  }

  private getAdapter(): UserLibraryLikesAdapter {
    this.ensurePlatform()
    if (!this.adapter) {
      this.adapter = resolveUserLibraryLikesAdapter()
    }
    return this.adapter
  }

  getState(): UserLibraryLikesState {
    this.ensurePlatform()
    console.log('[UserLibrary] Get likes state', {
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

  async loadNextPage(): Promise<UserLibraryLikesState> {
    this.ensurePlatform()
    if (this.state.isLoading || !this.state.hasMore) {
      return this.state
    }

    console.log('[UserLibrary] Fetch likes page', {
      cursor: this.state.cursor,
      limit: LIKES_PAGE_SIZE,
    })

    this.state.isLoading = true
    this.state.error = null

    try {
      const page: UserLibraryPage<UserTrack> = await this.getAdapter().getLikedTracks({
        limit: LIKES_PAGE_SIZE,
        cursor: this.state.cursor,
      })
      this.state = {
        ...this.state,
        items: [...this.state.items, ...page.items],
        cursor: page.nextCursor,
        hasMore: page.hasMore,
        isLoading: false,
      }
      console.log('[UserLibrary] Likes page loaded', {
        items: page.items.length,
        total: this.state.items.length,
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
      })
    } catch (error) {
      this.state.error = toErrorMessage(error)
      console.log('[UserLibrary] Likes page error', this.state.error)
    } finally {
      this.state.isLoading = false
    }

    return this.state
  }
}

export const userLibraryLikesFacade = new UserLibraryLikesFacade()
