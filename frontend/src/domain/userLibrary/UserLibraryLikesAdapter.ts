import type { UserLibraryCursor, UserLibraryPage, UserTrack } from './UserLibraryAdapter'

export interface UserLibraryLikesAdapter {
  getLikedTracks(request: { limit: number; cursor?: UserLibraryCursor }): Promise<UserLibraryPage<UserTrack>>
}
