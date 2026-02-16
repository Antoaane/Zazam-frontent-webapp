import type { UserLibraryLikesAdapter } from '../UserLibraryLikesAdapter'

const notImplemented = async (): Promise<never> => {
  throw new Error('Apple Music liked tracks are not available yet.')
}

export const appleMusicUserLibraryLikesAdapter: UserLibraryLikesAdapter = {
  getLikedTracks: notImplemented,
}
