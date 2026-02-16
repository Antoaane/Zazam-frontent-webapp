/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SPOTIFY_CLIENT_ID?: string
  readonly SPOTIFY_CLIENT_ID?: string
  readonly VITE_SPOTIFY_REDIRECT_URI?: string
  readonly VITE_SPOTIFY_SHOW_DIALOG?: string
  readonly VITE_TIDAL_CLIENT_ID?: string
  readonly VITE_TIDAL_CLIENT_SECRET?: string
  readonly TIDAL_CLIENT_ID?: string
  readonly TIDAL_CLIENT_SECRET?: string
  readonly VITE_TIDAL_CLIENT_UNIQUE_KEY?: string
  readonly VITE_TIDAL_REDIRECT_URI?: string
  readonly VITE_REDIRECT_URI?: string
  readonly VITE_USER_LIBRARY_PLATFORM?: string
  readonly VITE_LIBRARY_PLATFORM?: string
  readonly VITE_PLAYBACK_PLATFORM?: string
  readonly VITE_PLAYER_PLATFORM?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
