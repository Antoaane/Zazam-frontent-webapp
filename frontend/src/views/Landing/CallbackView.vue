<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getStoredPlatform, setStoredPlatform, type MusicPlatform } from '@/domain/platform/PlatformStorage'
import { finalizeTidalLogin } from '@/domain/tidal/tidalAuth'

const router = useRouter()
const route = useRoute()

const spotifyClientId =
  import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? import.meta.env.SPOTIFY_CLIENT_ID ?? ''
const spotifyRedirectEnv =
  import.meta.env.VITE_SPOTIFY_REDIRECT_URI ?? import.meta.env.VITE_REDIRECT_URI ?? ''
const redirectFallback =
  typeof window !== 'undefined' ? `${window.location.origin}/callback` : ''
const spotifyRedirectUri = spotifyRedirectEnv || redirectFallback

const SPOTIFY_KEYS = {
  authCode: 'spotify_auth_code',
  authCodeReceivedAt: 'spotify_auth_code_received_at',
  accessToken: 'spotify_access_token',
  expiresAt: 'spotify_token_expires_at',
  refreshToken: 'spotify_refresh_token',
  codeVerifier: 'spotify_code_verifier',
  authState: 'spotify_auth_state',
}

const TIDAL_STATE_KEY = 'tidal_auth_state'

type TokenResponse = {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  token_type?: string
  scope?: string
}

const parseTokenResponse = async (response: Response, label: string): Promise<TokenResponse> => {
  const responseText = await response.text().catch(() => '')
  let responseBody: unknown = responseText
  if (responseText) {
    try {
      responseBody = JSON.parse(responseText)
    } catch {
      responseBody = responseText
    }
  }

  if (!response.ok) {
    console.log('[Login] Token exchange failed', {
      provider: label,
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
    })
    throw new Error(`${label} token exchange failed.`)
  }

  console.log('[Login] Token exchange response', { provider: label, responseBody })
  return responseBody as TokenResponse
}

const fetchSpotifyToken = async (code: string, verifier: string) => {
  const body = new URLSearchParams({
    client_id: spotifyClientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: spotifyRedirectUri,
    code_verifier: verifier,
  })

  console.log('[Login] Exchange code for token', { provider: 'spotify', redirectUri: spotifyRedirectUri })
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  return parseTokenResponse(response, 'Spotify')
}

const resolvePlatformFromState = (state: string): MusicPlatform | null => {
  if (!state) {
    return null
  }

  const spotifyState = sessionStorage.getItem(SPOTIFY_KEYS.authState)
  if (spotifyState && state === spotifyState) {
    return 'spotify'
  }

  const tidalState = sessionStorage.getItem(TIDAL_STATE_KEY)
  if (tidalState && state === tidalState) {
    return 'tidal'
  }

  if (state.startsWith('spotify')) {
    return 'spotify'
  }

  if (state.startsWith('tidal')) {
    return 'tidal'
  }

  return null
}

const storeToken = (keys: typeof SPOTIFY_KEYS, token: TokenResponse) => {
  if (token.access_token) {
    localStorage.setItem(keys.accessToken, token.access_token)
    const expiresInMs = (token.expires_in ?? 0) * 1000
    if (expiresInMs) {
      localStorage.setItem(keys.expiresAt, (Date.now() + expiresInMs).toString())
    }
    if (token.refresh_token) {
      localStorage.setItem(keys.refreshToken, token.refresh_token)
    }
    console.log('[Login] Access token stored', { key: keys.accessToken })
  } else {
    console.log('[Login] Token exchange response missing access_token', token)
  }
}

onMounted(() => {
  const run = async () => {
    const code = typeof route.query.code === 'string' ? route.query.code : ''
    const state = typeof route.query.state === 'string' ? route.query.state : ''
    const error = typeof route.query.error === 'string' ? route.query.error : ''
    console.log('[Login] Callback received', { hasCode: Boolean(code), hasState: Boolean(state), error })

    const resolvedPlatform = resolvePlatformFromState(state) ?? getStoredPlatform() ?? 'spotify'
    setStoredPlatform(resolvedPlatform)

    if (resolvedPlatform === 'tidal') {
      if (error || !code) {
        console.log('[Login] TIDAL callback error', { error })
        sessionStorage.removeItem(TIDAL_STATE_KEY)
        await router.replace({ name: 'zazam' })
        return
      }

      try {
        await finalizeTidalLogin(window.location.search)
      } catch (error) {
        console.log('[Login] TIDAL finalize error', error)
      } finally {
        sessionStorage.removeItem(TIDAL_STATE_KEY)
        await router.replace({ name: 'zazam' })
      }
      return
    }

    if (code) {
      sessionStorage.setItem(SPOTIFY_KEYS.authCode, code)
      sessionStorage.setItem(SPOTIFY_KEYS.authCodeReceivedAt, Date.now().toString())
    }

    const verifier = sessionStorage.getItem(SPOTIFY_KEYS.codeVerifier) ?? ''
    if (error || !code || !verifier || !spotifyClientId) {
      console.log('[Login] Missing data for token exchange', {
        platform: resolvedPlatform,
        hasCode: Boolean(code),
        hasVerifier: Boolean(verifier),
        hasClientId: Boolean(spotifyClientId),
        error,
      })
      sessionStorage.removeItem(SPOTIFY_KEYS.codeVerifier)
      sessionStorage.removeItem(SPOTIFY_KEYS.authState)
      await router.replace({ name: 'zazam' })
      return
    }

    try {
      const tokenResponse = await fetchSpotifyToken(code, verifier)
      storeToken(SPOTIFY_KEYS, tokenResponse)
    } catch (error) {
      console.log('[Login] Token exchange error', error)
    } finally {
      sessionStorage.removeItem(SPOTIFY_KEYS.codeVerifier)
      sessionStorage.removeItem(SPOTIFY_KEYS.authState)
      await router.replace({ name: 'zazam' })
    }
  }

  void run()
})
</script>

<template>
  <section class="flex-1 flex items-center justify-center">
    <div class="glass rounded-5xl px-6 py-4">
      <p class="font-base text-sm text-primary/80">Connexion en cours...</p>
    </div>
  </section>
</template>
