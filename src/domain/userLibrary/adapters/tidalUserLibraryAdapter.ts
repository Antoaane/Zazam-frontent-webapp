import type { UserLibraryAdapter } from '../UserLibraryAdapter'

const notImplemented = async (): Promise<never> => {
  throw new Error('Tidal user library is not available yet.')
}

export const tidalUserLibraryAdapter: UserLibraryAdapter = {
  getPlaylists: notImplemented,
  getPlaylistTracks: notImplemented,
}
