import type { UserLibraryCursor, UserLibraryPage, UserTrack } from './UserLibraryAdapter'

export interface UserLibrarySearchAdapter {
  searchTracks(request: { query: string; limit: number; cursor?: UserLibraryCursor }): Promise<UserLibraryPage<UserTrack>>
}
