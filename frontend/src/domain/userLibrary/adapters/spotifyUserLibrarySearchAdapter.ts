import type { UserLibrarySearchAdapter } from '../UserLibrarySearchAdapter'

const notImplemented = async (): Promise<never> => {
  throw new Error('Spotify search is not available yet.')
}

export const spotifyUserLibrarySearchAdapter: UserLibrarySearchAdapter = {
  searchTracks: notImplemented,
}
