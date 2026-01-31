import type { UserLibraryAdapter } from '../UserLibraryAdapter'

const notImplemented = async (): Promise<never> => {
  throw new Error('Apple Music user library is not available yet.')
}

export const appleMusicUserLibraryAdapter: UserLibraryAdapter = {
  getPlaylists: notImplemented,
  getPlaylistTracks: notImplemented,
}
