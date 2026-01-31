<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const router = useRouter()
const route = useRoute()

const AUTH_CODE_KEY = 'spotify_auth_code'
const AUTH_CODE_RECEIVED_AT_KEY = 'spotify_auth_code_received_at'
const ACCESS_TOKEN_KEY = 'spotify_access_token'
const EXPIRES_AT_KEY = 'spotify_token_expires_at'
const CODE_VERIFIER_KEY = 'spotify_code_verifier'
const spotifyClientId =
  import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? import.meta.env.SPOTIFY_CLIENT_ID ?? ''
const envRedirectUri =
  import.meta.env.VITE_SPOTIFY_REDIRECT_URI ?? import.meta.env.VITE_REDIRECT_URI ?? ''
const redirectUri = envRedirectUri || (typeof window !== 'undefined' ? window.location.origin : '')

const fetchSpotifyToken = async (code: string, verifier: string) => {
  const body = new URLSearchParams({
    client_id: spotifyClientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: verifier,
  })

  console.log('[Login] Exchange code for token', { redirectUri })
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })

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
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
    })
    throw new Error('Spotify token exchange failed.')
  }

  console.log('[Login] Token exchange response', responseBody)
  return responseBody as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    token_type?: string
  }
}

onMounted(() => {
  const run = async () => {
    const code = typeof route.query.code === 'string' ? route.query.code : ''
    console.log('[Login] Callback received', { hasCode: Boolean(code) })

    if (code) {
      sessionStorage.setItem(AUTH_CODE_KEY, code)
      sessionStorage.setItem(AUTH_CODE_RECEIVED_AT_KEY, Date.now().toString())
    }

    const verifier = sessionStorage.getItem(CODE_VERIFIER_KEY) ?? ''
    if (!code || !verifier || !spotifyClientId) {
      console.log('[Login] Missing data for token exchange', {
        hasCode: Boolean(code),
        hasVerifier: Boolean(verifier),
        hasClientId: Boolean(spotifyClientId),
      })
      await router.replace({ name: 'zazam' })
      return
    }

    try {
      const tokenResponse = await fetchSpotifyToken(code, verifier)
      if (tokenResponse.access_token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, tokenResponse.access_token)
        const expiresInMs = (tokenResponse.expires_in ?? 0) * 1000
        if (expiresInMs) {
          localStorage.setItem(EXPIRES_AT_KEY, (Date.now() + expiresInMs).toString())
        }
        if (tokenResponse.refresh_token) {
          localStorage.setItem('spotify_refresh_token', tokenResponse.refresh_token)
        }
        console.log('[Login] Access token stored', tokenResponse.access_token)
      } else {
        console.log('[Login] Token exchange response missing access_token', tokenResponse)
      }
    } catch (error) {
      console.log('[Login] Token exchange error', error)
    } finally {
      sessionStorage.removeItem(CODE_VERIFIER_KEY)
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
