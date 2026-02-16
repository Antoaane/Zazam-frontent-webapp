import type { UserLibrarySearchAdapter } from '../UserLibrarySearchAdapter'

const notImplemented = async (): Promise<never> => {
  throw new Error('Deezer search is not available yet.')
}

export const deezerUserLibrarySearchAdapter: UserLibrarySearchAdapter = {
  searchTracks: notImplemented,
}
