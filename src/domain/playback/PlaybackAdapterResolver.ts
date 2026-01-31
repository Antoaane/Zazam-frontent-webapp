import type { PlaybackAdapter, PlaybackPlatform } from './PlaybackAdapter'
import { spotifyPlaybackAdapter } from './adapters/SpotifyPlaybackAdapter'
import { deezerPlaybackAdapter } from './adapters/DeezerPlaybackAdapter'
import { appleMusicPlaybackAdapter } from './adapters/AppleMusicPlaybackAdapter'
import { tidalPlaybackAdapter } from './adapters/TidalPlaybackAdapter'

const PLATFORM_ENV_KEYS = ['VITE_PLAYBACK_PLATFORM', 'VITE_PLAYER_PLATFORM']

const normalizePlatform = (value: string): PlaybackPlatform | null => {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'spotify') return 'spotify'
  if (normalized === 'deezer') return 'deezer'
  if (normalized === 'tidal') return 'tidal'
  if (normalized === 'apple' || normalized === 'apple_music' || normalized === 'apple-music') {
    return 'apple_music'
  }
  return null
}

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

  if (localStorage.getItem('tidal_access_token')) {
    return 'tidal'
  }

  return null
}

export const resolvePlaybackPlatform = (): PlaybackPlatform => {
  return resolvePlatformFromEnv() ?? resolvePlatformFromStorage() ?? 'spotify'
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
