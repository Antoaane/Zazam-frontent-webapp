import type { UserLibraryLikesAdapter } from './UserLibraryLikesAdapter'
import { resolveUserLibraryPlatform } from './UserLibraryResolver'
import { spotifyUserLibraryLikesAdapter } from './adapters/spotifyUserLibraryLikesAdapter'
import { deezerUserLibraryLikesAdapter } from './adapters/deezerUserLibraryLikesAdapter'
import { appleMusicUserLibraryLikesAdapter } from './adapters/appleMusicUserLibraryLikesAdapter'
import { tidalUserLibraryLikesAdapter } from './adapters/tidalUserLibraryLikesAdapter'

export const resolveUserLibraryLikesAdapter = (): UserLibraryLikesAdapter => {
  const platform = resolveUserLibraryPlatform()
  console.log('[UserLibrary] Resolve likes adapter', { platform })

  switch (platform) {
    case 'deezer':
      return deezerUserLibraryLikesAdapter
    case 'apple_music':
      return appleMusicUserLibraryLikesAdapter
    case 'tidal':
      return tidalUserLibraryLikesAdapter
    case 'spotify':
    default:
      return spotifyUserLibraryLikesAdapter
  }
}
