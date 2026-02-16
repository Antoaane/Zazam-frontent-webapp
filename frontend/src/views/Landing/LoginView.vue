<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { setStoredPlatform, type MusicPlatform } from '@/domain/platform/PlatformStorage'
import { getTidalClientId, getTidalLoginUrl } from '@/domain/tidal/tidalAuth'

const spotifyClientId =
  import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? import.meta.env.SPOTIFY_CLIENT_ID ?? ''
const tidalClientId = getTidalClientId()

const spotifyRedirectEnv =
  import.meta.env.VITE_SPOTIFY_REDIRECT_URI ?? import.meta.env.VITE_REDIRECT_URI ?? ''
const redirectFallback =
  typeof window !== 'undefined' ? `${window.location.origin}/callback` : ''
const spotifyRedirectUri = spotifyRedirectEnv || redirectFallback
const forceDialog = import.meta.env.VITE_SPOTIFY_SHOW_DIALOG === 'true'

const SPOTIFY_CODE_VERIFIER_KEY = 'spotify_code_verifier'
const SPOTIFY_STATE_KEY = 'spotify_auth_state'
const TIDAL_STATE_KEY = 'tidal_auth_state'

const spotifyScopes: string[] = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-modify-playback-state',
  'user-read-playback-state',
  'user-library-read',
  'playlist-read-private',
  'playlist-modify-private',
  'playlist-modify-public',
]

const spotifyAuthUrl = ref('')
const tidalAuthUrl = ref('')

const isSpotifyConfigured = computed(() => Boolean(spotifyClientId))
const isTidalConfigured = computed(() => Boolean(tidalAuthUrl.value))

const base64UrlEncode = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const generateCodeVerifier = (length: number): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const values = new Uint8Array(length)
  crypto.getRandomValues(values)
  return Array.from(values, (value) => charset[value % charset.length]).join('')
}

const generateCodeChallenge = async (verifier: string): Promise<string> => {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(digest)
}

const generateState = (platform: string): string => `${platform}:${generateCodeVerifier(20)}`

const buildAuthUrl = async (options: {
  authBase: string
  clientId: string
  redirectUri: string
  scopes: string[]
  verifierKey: string
  stateKey: string
  statePrefix: string
  extraParams?: Record<string, string>
}): Promise<string> => {
  if (!options.clientId || !options.redirectUri) {
    return ''
  }

  const verifier = generateCodeVerifier(64)
  sessionStorage.setItem(options.verifierKey, verifier)
  const challenge = await generateCodeChallenge(verifier)
  const state = generateState(options.statePrefix)
  sessionStorage.setItem(options.stateKey, state)

  const params = new URLSearchParams({
    client_id: options.clientId,
    response_type: 'code',
    redirect_uri: options.redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  })

  if (options.scopes.length > 0) {
    params.set('scope', options.scopes.join(' '))
  }

  if (options.extraParams) {
    Object.entries(options.extraParams).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      }
    })
  }

  return `${options.authBase}?${params.toString()}`
}

const handlePlatformClick = (platform: MusicPlatform) => {
  setStoredPlatform(platform)
}

onMounted(async () => {
  if (spotifyClientId && spotifyRedirectUri) {
    spotifyAuthUrl.value = await buildAuthUrl({
      authBase: 'https://accounts.spotify.com/authorize',
      clientId: spotifyClientId,
      redirectUri: spotifyRedirectUri,
      scopes: spotifyScopes,
      verifierKey: SPOTIFY_CODE_VERIFIER_KEY,
      stateKey: SPOTIFY_STATE_KEY,
      statePrefix: 'spotify',
      extraParams: forceDialog ? { show_dialog: 'true' } : undefined,
    })
    console.log('[Login] Spotify auth URL ready', { redirectUri: spotifyRedirectUri })
  }

  if (tidalClientId) {
    const state = generateState('tidal')
    sessionStorage.setItem(TIDAL_STATE_KEY, state)
    try {
      tidalAuthUrl.value = await getTidalLoginUrl({
        state,
        language: typeof navigator !== 'undefined' ? navigator.language : 'en-US',
      })
      console.log('[Login] TIDAL auth URL ready')
    } catch (error) {
      console.log('[Login] TIDAL auth init failed', error)
    }
  }
})
</script>

<template>
  <section class="flex-1 flex items-center justify-center">
    <div class="w-full max-w-md md:max-w-lg px-4 flex flex-col items-center text-center gap-10">
      <div class="flex flex-col items-center gap-4">
        <h1 class="brand font-title text-[64px] sm:text-[72px] text-primary leading-none">
          Zaza<span>m</span>
        </h1>
        <div class="glass rounded-full px-5 py-2">
          <p class="font-base text-sm sm:text-base text-primary/80">
            listen to music with your heretic friends
          </p>
        </div>
      </div>

      <div class="flex flex-col items-center gap-3">
        <p class="font-base text-xs uppercase tracking-[0.35em] text-primary/60">connect with</p>
        <div class="flex flex-col items-center gap-3">
          <a
            :href="spotifyAuthUrl"
            class="group inline-flex items-center gap-3 rounded-full bg-primary px-6 py-2.5 text-secondary font-medium shadow-lg shadow-secondary/30 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            :class="{
              'pointer-events-none opacity-60': !isSpotifyConfigured,
            }"
            :aria-disabled="!isSpotifyConfigured"
            @click="handlePlatformClick('spotify')"
          >
            <img src="/pictos/spotify.svg" alt="spotify" class="h-5 w-5" />
            <span class="text-spotify text-base">Spotify</span>
          </a>
          <a
            :href="tidalAuthUrl"
            class="group inline-flex items-center gap-3 rounded-full bg-primary px-6 py-2.5 text-secondary font-medium shadow-lg shadow-secondary/30 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            :class="{
              'pointer-events-none opacity-60': !isTidalConfigured,
            }"
            :aria-disabled="!isTidalConfigured"
            @click="handlePlatformClick('tidal')"
          >
            <img src="/pictos/tidal.svg" alt="tidal" class="h-5 w-5" />
            <span class="text-base">TIDAL</span>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.brand > span {
  font-feature-settings: 'salt' on;
}
</style>
