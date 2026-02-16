export type MusicPlatform = 'spotify' | 'deezer' | 'apple_music' | 'tidal'

const ACTIVE_PLATFORM_KEY = 'zazam_active_platform'

export const normalizePlatform = (value: string): MusicPlatform | null => {
  const normalized = value.trim().toLowerCase()
  if (normalized === 'spotify') return 'spotify'
  if (normalized === 'deezer') return 'deezer'
  if (normalized === 'tidal') return 'tidal'
  if (normalized === 'apple' || normalized === 'apple_music' || normalized === 'apple-music') {
    return 'apple_music'
  }
  return null
}

export const getStoredPlatform = (): MusicPlatform | null => {
  if (typeof window === 'undefined') {
    return null
  }
  const raw = localStorage.getItem(ACTIVE_PLATFORM_KEY)
  if (!raw) {
    return null
  }
  return normalizePlatform(raw)
}

export const setStoredPlatform = (platform: MusicPlatform): void => {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.setItem(ACTIVE_PLATFORM_KEY, platform)
}

export const clearStoredPlatform = (): void => {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.removeItem(ACTIVE_PLATFORM_KEY)
}

export const ACTIVE_PLATFORM_STORAGE_KEY = ACTIVE_PLATFORM_KEY
