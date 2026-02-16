import type { MusicPlatform } from '../platform/PlatformStorage'
import { getStoredPlatform } from '../platform/PlatformStorage'
import { hasTidalSessionFlag } from '../tidal/tidalSession'

const AUTH_CODE_TTL_MS = 10 * 60 * 1000
const TOKEN_FALLBACK_TTL_MS = 2 * 60 * 60 * 1000

const hasValidToken = (tokenKey: string, expiresAtKey: string, fallbackTtlMs = 0): boolean => {
  if (typeof window === 'undefined') {
    return false
  }
  const token = localStorage.getItem(tokenKey)
  if (!token) {
    return false
  }

  const expiresAtRaw = localStorage.getItem(expiresAtKey)
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : 0

  if (!expiresAt || Number.isNaN(expiresAt)) {
    if (fallbackTtlMs > 0) {
      localStorage.setItem(expiresAtKey, (Date.now() + fallbackTtlMs).toString())
    }
    return true
  }

  return Date.now() < expiresAt
}

const hasValidAuthCode = (codeKey: string, receivedAtKey: string): boolean => {
  if (typeof window === 'undefined') {
    return false
  }
  const code = sessionStorage.getItem(codeKey)
  const codeAtRaw = sessionStorage.getItem(receivedAtKey)
  const codeAt = codeAtRaw ? Number(codeAtRaw) : 0
  return Boolean(code && codeAt && Date.now() - codeAt < AUTH_CODE_TTL_MS)
}

export const hasValidSpotifySession = (): boolean =>
  hasValidToken('spotify_access_token', 'spotify_token_expires_at', TOKEN_FALLBACK_TTL_MS) ||
  hasValidAuthCode('spotify_auth_code', 'spotify_auth_code_received_at')

export const hasValidTidalSession = (): boolean =>
  hasTidalSessionFlag() ||
  hasValidToken('tidal_access_token', 'tidal_token_expires_at', TOKEN_FALLBACK_TTL_MS) ||
  hasValidAuthCode('tidal_auth_code', 'tidal_auth_code_received_at')

const hasValidPlatformSession = (platform: MusicPlatform): boolean => {
  if (platform === 'spotify') return hasValidSpotifySession()
  if (platform === 'tidal') return hasValidTidalSession()
  if (platform === 'deezer') return Boolean(localStorage.getItem('deezer_access_token'))
  if (platform === 'apple_music') return Boolean(localStorage.getItem('apple_music_token'))
  return false
}

export const hasValidSession = (): boolean => {
  if (typeof window === 'undefined') {
    return false
  }
  const preferred = getStoredPlatform()
  if (preferred) {
    return hasValidPlatformSession(preferred)
  }

  return (
    hasValidSpotifySession() ||
    hasValidTidalSession() ||
    Boolean(localStorage.getItem('deezer_access_token')) ||
    Boolean(localStorage.getItem('apple_music_token'))
  )
}
