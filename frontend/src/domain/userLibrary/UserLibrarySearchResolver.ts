import type { UserLibrarySearchAdapter } from './UserLibrarySearchAdapter'
import { resolveUserLibraryPlatform } from './UserLibraryResolver'
import { spotifyUserLibrarySearchAdapter } from './adapters/spotifyUserLibrarySearchAdapter'
import { deezerUserLibrarySearchAdapter } from './adapters/deezerUserLibrarySearchAdapter'
import { appleMusicUserLibrarySearchAdapter } from './adapters/appleMusicUserLibrarySearchAdapter'
import { tidalUserLibrarySearchAdapter } from './adapters/tidalUserLibrarySearchAdapter'

export const resolveUserLibrarySearchAdapter = (): UserLibrarySearchAdapter => {
  const platform = resolveUserLibraryPlatform()
  console.log('[UserLibrary] Resolve search adapter', { platform })

  switch (platform) {
    case 'deezer':
      return deezerUserLibrarySearchAdapter
    case 'apple_music':
      return appleMusicUserLibrarySearchAdapter
    case 'tidal':
      return tidalUserLibrarySearchAdapter
    case 'spotify':
    default:
      return spotifyUserLibrarySearchAdapter
  }
}
