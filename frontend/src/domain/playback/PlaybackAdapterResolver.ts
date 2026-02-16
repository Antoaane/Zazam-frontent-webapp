import type { PlaybackAdapter, PlaybackPlatform } from './PlaybackAdapter'
import { getStoredPlatform, normalizePlatform } from '../platform/PlatformStorage'
import { spotifyPlaybackAdapter } from './adapters/SpotifyPlaybackAdapter'
import { deezerPlaybackAdapter } from './adapters/DeezerPlaybackAdapter'
import { appleMusicPlaybackAdapter } from './adapters/AppleMusicPlaybackAdapter'
import { tidalPlaybackAdapter } from './adapters/TidalPlaybackAdapter'
import { hasTidalSessionFlag } from '../tidal/tidalSession'

const PLATFORM_ENV_KEYS = ['VITE_PLAYBACK_PLATFORM', 'VITE_PLAYER_PLATFORM']

const resolvePlatformFromEnv = (): PlaybackPlatform | null => {
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

const resolvePlatformFromPreference = (): PlaybackPlatform | null => {
  return getStoredPlatform()
}

const resolvePlatformFromStorage = (): PlaybackPlatform | null => {
  if (typeof window === 'undefined') {
    return null
  }

  if (localStorage.getItem('spotify_access_token')) {
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

export const resolvePlaybackPlatform = (): PlaybackPlatform => {
  return resolvePlatformFromEnv() ?? resolvePlatformFromPreference() ?? resolvePlatformFromStorage() ?? 'spotify'
}

export const resolvePlaybackAdapter = (): PlaybackAdapter => {
  const platform = resolvePlaybackPlatform()

  switch (platform) {
    case 'deezer':
      return deezerPlaybackAdapter
    case 'apple_music':
      return appleMusicPlaybackAdapter
    case 'tidal':
      return tidalPlaybackAdapter
    case 'spotify':
    default:
      return spotifyPlaybackAdapter
  }
}
