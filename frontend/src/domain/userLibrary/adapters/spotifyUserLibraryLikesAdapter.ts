import type { UserLibraryLikesAdapter } from '../UserLibraryLikesAdapter'

const notImplemented = async (): Promise<never> => {
  throw new Error('Spotify liked tracks are not available yet.')
}

export const spotifyUserLibraryLikesAdapter: UserLibraryLikesAdapter = {
  getLikedTracks: notImplemented,
}
