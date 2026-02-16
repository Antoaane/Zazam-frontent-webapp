import { credentialsProvider, finalizeLogin, init, initializeLogin, setCredentials } from '@tidal-music/auth'
import type { Credentials } from '@tidal-music/common'
import { clearTidalSessionActive, markTidalSessionActive } from './tidalSession'

const DEFAULT_STORAGE_KEY = 'zazam_tidal_auth'
const LEGACY_TOKEN_KEYS = {
  accessToken: 'tidal_access_token',
  expiresAt: 'tidal_token_expires_at',
  refreshToken: 'tidal_refresh_token',
}

export const TIDAL_SCOPES = [
  'collection.read',
  'collection.write',
  'playlists.read',
  'playlists.write',
  'playback',
  'user.read',
  'recommendations.read',
  'entitlements.read',
  'search.read',
  'search.write',
]

let initPromise: Promise<void> | null = null
let busAttached = false
let migrationAttempted = false

const readEnv = (key: string): string =>
  (import.meta.env[key as keyof ImportMetaEnv] as string | undefined) ?? ''

export const getTidalClientId = (): string =>
  readEnv('VITE_TIDAL_CLIENT_ID') || readEnv('TIDAL_CLIENT_ID')

export const getTidalClientSecret = (): string =>
  readEnv('VITE_TIDAL_CLIENT_SECRET') || readEnv('TIDAL_CLIENT_SECRET')

export const getTidalClientUniqueKey = (): string =>
  readEnv('VITE_TIDAL_CLIENT_UNIQUE_KEY')

export const getTidalRedirectUri = (): string => {
  if (typeof window === 'undefined') {
    return ''
  }
  const redirectEnv = readEnv('VITE_TIDAL_REDIRECT_URI') || readEnv('VITE_REDIRECT_URI')
  return redirectEnv || `${window.location.origin}/callback`
}

const assertHttpsRedirect = (redirectUri: string) => {
  if (!redirectUri) {
    throw new Error('Missing TIDAL redirect URI. Define VITE_TIDAL_REDIRECT_URI.')
  }
  if (!redirectUri.startsWith('https://')) {
    throw new Error('TIDAL Web SDK requires an HTTPS redirect URI.')
  }
}

const attachAuthBus = () => {
  if (busAttached || typeof window === 'undefined') {
    return
  }
  busAttached = true
  credentialsProvider.bus((event) => {
    const payload = event.detail?.payload
    if (payload?.token) {
      markTidalSessionActive()
    } else {
      clearTidalSessionActive()
    }
  })
}

const migrateLegacyCredentials = async () => {
  if (migrationAttempted || typeof window === 'undefined') {
    return
  }
  migrationAttempted = true

  const token = localStorage.getItem(LEGACY_TOKEN_KEYS.accessToken)
  if (!token) {
    return
  }

  const clientId = getTidalClientId()
  if (!clientId) {
    return
  }

  const expiresAtRaw = localStorage.getItem(LEGACY_TOKEN_KEYS.expiresAt)
  const expiresAt = expiresAtRaw ? Number(expiresAtRaw) : Date.now() + 60 * 60 * 1000
  const refreshToken = localStorage.getItem(LEGACY_TOKEN_KEYS.refreshToken) ?? undefined
  const clientUniqueKey = getTidalClientUniqueKey() || undefined

  const accessToken: Credentials = {
    clientId,
    clientUniqueKey,
    expires: Number.isNaN(expiresAt) ? Date.now() + 60 * 60 * 1000 : expiresAt,
    grantedScopes: [...TIDAL_SCOPES],
    requestedScopes: [...TIDAL_SCOPES],
    token,
  }

  try {
    await setCredentials({ accessToken, refreshToken })
    markTidalSessionActive()
    Object.values(LEGACY_TOKEN_KEYS).forEach((key) => localStorage.removeItem(key))
  } catch (error) {
    console.log('[TIDAL Auth] Legacy credential migration failed', error)
  }
}

export const ensureTidalAuthInitialized = async (): Promise<void> => {
  if (initPromise) {
    return initPromise
  }

  const clientId = getTidalClientId()
  if (!clientId) {
    throw new Error('Missing TIDAL client id. Define VITE_TIDAL_CLIENT_ID.')
  }

  const clientSecret = getTidalClientSecret() || undefined
  const clientUniqueKey = getTidalClientUniqueKey() || undefined

  initPromise = init({
    clientId,
    clientSecret,
    clientUniqueKey,
    credentialsStorageKey: DEFAULT_STORAGE_KEY,
    scopes: TIDAL_SCOPES,
  })

  await initPromise
  attachAuthBus()
  await migrateLegacyCredentials()
}

export const getTidalLoginUrl = async (loginConfig?: Record<string, string>): Promise<string> => {
  await ensureTidalAuthInitialized()
  const redirectUri = getTidalRedirectUri()
  assertHttpsRedirect(redirectUri)
  return initializeLogin({ redirectUri, loginConfig })
}

export const finalizeTidalLogin = async (queryString: string): Promise<void> => {
  await ensureTidalAuthInitialized()
  await finalizeLogin(queryString)
  markTidalSessionActive()
}

export const getTidalAccessToken = async (): Promise<string> => {
  await ensureTidalAuthInitialized()
  const credentials = await credentialsProvider.getCredentials()
  if (!credentials.token) {
    clearTidalSessionActive()
    throw new Error('Missing TIDAL access token. Please reconnect to TIDAL.')
  }
  markTidalSessionActive()
  return credentials.token
}

export const getTidalCredentials = async () => {
  await ensureTidalAuthInitialized()
  return credentialsProvider.getCredentials()
}
