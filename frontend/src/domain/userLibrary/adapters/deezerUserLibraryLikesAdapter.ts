import type { UserLibraryLikesAdapter } from '../UserLibraryLikesAdapter'

const notImplemented = async (): Promise<never> => {
  throw new Error('Deezer liked tracks are not available yet.')
}

export const deezerUserLibraryLikesAdapter: UserLibraryLikesAdapter = {
  getLikedTracks: notImplemented,
}
