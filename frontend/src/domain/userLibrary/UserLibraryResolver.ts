import type { UserLibraryAdapter, UserLibraryPlatform } from './UserLibraryAdapter'
import { getStoredPlatform, normalizePlatform } from '../platform/PlatformStorage'
import { spotifyUserLibraryAdapter } from './adapters/spotifyUserLibraryAdapter'
import { deezerUserLibraryAdapter } from './adapters/deezerUserLibraryAdapter'
import { appleMusicUserLibraryAdapter } from './adapters/appleMusicUserLibraryAdapter'
import { tidalUserLibraryAdapter } from './adapters/tidalUserLibraryAdapter'
import { hasTidalSessionFlag } from '../tidal/tidalSession'

const PLATFORM_ENV_KEYS = ['VITE_USER_LIBRARY_PLATFORM', 'VITE_LIBRARY_PLATFORM']

const resolvePlatformFromEnv = (): UserLibraryPlatform | null => {
  for (const key of PLATFORM_ENV_KEYS) {
    const raw = import.meta.env[key as keyof ImportMetaEnv]
    if (typeof raw === 'string' && raw.trim()) {
      const normalized = normalizePlatform(raw)
      if (normalized) {
        return normalized
      }
    }
  }
  return null
}

const resolvePlatformFromPreference = (): UserLibraryPlatform | null => {
  return getStoredPlatform()
}

const resolvePlatformFromStorage = (): UserLibraryPlatform | null => {
  if (typeof window === 'undefined') {
    return null
  }

  if (localStorage.getItem('spotify_access_token') || sessionStorage.getItem('spotify_auth_code')) {
    return 'spotify'
  }

  if (localStorage.getItem('deezer_access_token')) {
    return 'deezer'
  }

  if (localStorage.getItem('apple_music_token')) {
    return 'apple_music'
  }

  if (hasTidalSessionFlag() || localStorage.getItem('tidal_access_token')) {
    return 'tidal'
  }

  return null
}

export const resolveUserLibraryPlatform = (): UserLibraryPlatform => {
  const resolved =
    resolvePlatformFromEnv() ?? resolvePlatformFromPreference() ?? resolvePlatformFromStorage() ?? 'spotify'
  console.log('[UserLibrary] Resolved platform', { platform: resolved })
  return resolved
}

export const resolveUserLibraryAdapter = (): UserLibraryAdapter => {
  const platform = resolveUserLibraryPlatform()
  console.log('[UserLibrary] Resolve adapter', { platform })

  switch (platform) {
    case 'deezer':
      return deezerUserLibraryAdapter
    case 'apple_music':
      return appleMusicUserLibraryAdapter
    case 'tidal':
      return tidalUserLibraryAdapter
    case 'spotify':
    default:
      return spotifyUserLibraryAdapter
  }
}
