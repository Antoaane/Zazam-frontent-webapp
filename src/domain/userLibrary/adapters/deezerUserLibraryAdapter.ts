import type { UserLibraryAdapter } from '../UserLibraryAdapter'

const notImplemented = async (): Promise<never> => {
  throw new Error('Deezer user library is not available yet.')
}

export const deezerUserLibraryAdapter: UserLibraryAdapter = {
  getPlaylists: notImplemented,
  getPlaylistTracks: notImplemented,
}
