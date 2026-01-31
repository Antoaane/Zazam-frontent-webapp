<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const spotifyClientId =
  import.meta.env.VITE_SPOTIFY_CLIENT_ID ?? import.meta.env.SPOTIFY_CLIENT_ID ?? ''

const envRedirectUri =
  import.meta.env.VITE_SPOTIFY_REDIRECT_URI ?? import.meta.env.VITE_REDIRECT_URI ?? ''
const redirectUri = envRedirectUri || (typeof window !== 'undefined' ? window.location.origin : '')
const forceDialog = import.meta.env.VITE_SPOTIFY_SHOW_DIALOG === 'true'
const CODE_VERIFIER_KEY = 'spotify_code_verifier'
const scopes: string[] = [
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
const isConfigured = computed(() => Boolean(spotifyClientId))

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

onMounted(async () => {
  if (!spotifyClientId || !redirectUri) {
    return
  }

  const verifier = generateCodeVerifier(64)
  sessionStorage.setItem(CODE_VERIFIER_KEY, verifier)
  const challenge = await generateCodeChallenge(verifier)

  const params = new URLSearchParams({
    client_id: spotifyClientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    code_challenge_method: 'S256',
    code_challenge: challenge,
  })

  if (scopes.length > 0) {
    params.set('scope', scopes.join(' '))
  }
  if (forceDialog) {
    params.set('show_dialog', 'true')
  }

  spotifyAuthUrl.value = `https://accounts.spotify.com/authorize?${params.toString()}`
  console.log('[Login] Spotify auth URL ready', { redirectUri })
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
        <a
          :href="spotifyAuthUrl"
          class="group inline-flex items-center gap-3 rounded-full bg-primary px-6 py-2.5 text-secondary font-medium shadow-lg shadow-secondary/30 transition hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          :class="{
            'pointer-events-none opacity-60': !isConfigured,
          }"
          :aria-disabled="!isConfigured"
        >
          <img src="/pictos/spotify.svg" alt="spotify" class="h-5 w-5" />
          <span class="text-spotify text-base">Spotify</span>
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.brand > span {
  font-feature-settings: 'salt' on;
}
</style>
