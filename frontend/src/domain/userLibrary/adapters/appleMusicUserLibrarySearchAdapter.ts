import type { UserLibrarySearchAdapter } from '../UserLibrarySearchAdapter'

const notImplemented = async (): Promise<never> => {
  throw new Error('Apple Music search is not available yet.')
}

export const appleMusicUserLibrarySearchAdapter: UserLibrarySearchAdapter = {
  searchTracks: notImplemented,
}
