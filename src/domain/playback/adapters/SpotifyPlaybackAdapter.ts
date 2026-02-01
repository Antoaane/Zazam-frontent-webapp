import type { PlaybackAdapter, PlaybackState, PlaybackStateListener, PlaybackTrack } from '../PlaybackAdapter'
import type { PlaybackCapabilities } from '../PlaybackCapabilities'

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string
        getOAuthToken: (cb: (token: string) => void) => void
        volume?: number
      }) => SpotifyPlayer
    }
    onSpotifyWebPlaybackSDKReady?: () => void
  }
}

type SpotifyPlayerState = {
  paused: boolean
  position: number
  duration: number
  track_window: {
    current_track: {
      id: string
      name: string
      artists: Array<{ name: string }>
      album: { name: string; images: Array<{ url: string }> }
    }
  }
}

type SpotifyPlayer = {
  connect: () => Promise<boolean>
  disconnect: () => void
  addListener: (event: string, cb: (payload: any) => void) => boolean
  removeListener: (event: string, cb?: (payload: any) => void) => boolean
  getCurrentState: () => Promise<SpotifyPlayerState | null>
  togglePlay: () => Promise<void>
  resume: () => Promise<void>
  pause: () => Promise<void>
  seek: (positionMs: number) => Promise<void>
}

const SPOTIFY_SDK_URL = 'https://sdk.scdn.co/spotify-player.js'
const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'
const DEFAULT_COVER = '/images/test/song-cover.png'

const capabilities: PlaybackCapabilities = {
  canPlayPause: true,
  canSeek: true,
  canSkip: true,
  supportsTransfer: true,
  supportsRemoteControl: true,
  supportsSync: true,
  requiresPremium: true,
}

const DEFAULT_STATE: PlaybackState = {
  isReady: false,
  isConnected: false,
  isPlaying: false,
  positionMs: 0,
  durationMs: 0,
  track: null,
  deviceId: null,
}

let sdkPromise: Promise<void> | null = null

const loadSpotifySdk = (): Promise<void> => {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Spotify SDK requires a browser environment.'))
  }

  if (window.Spotify?.Player) {
    return Promise.resolve()
  }

  if (sdkPromise) {
    return sdkPromise
  }

  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-spotify-sdk]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error('Failed to load Spotify SDK.')))
      return
    }

    const script = document.createElement('script')
    script.src = SPOTIFY_SDK_URL
    script.async = true
    script.defer = true
    script.dataset.spotifySdk = 'true'
    script.onload = () => {
      if (window.Spotify?.Player) {
        resolve()
      }
    }
    script.onerror = () => reject(new Error('Failed to load Spotify SDK.'))
    window.onSpotifyWebPlaybackSDKReady = () => resolve()
    document.body.appendChild(script)
  })

  return sdkPromise
}

const getSpotifyAccessToken = (): string => {
  if (typeof window === 'undefined') {
    return ''
  }
  return localStorage.getItem('spotify_access_token') ?? ''
}

const buildSpotifyUrl = (path: string): string => `${SPOTIFY_API_BASE}${path}`

const transferPlayback = async (deviceId: string): Promise<void> => {
  const token = getSpotifyAccessToken()
  if (!token) {
    throw new Error('Missing Spotify access token.')
  }

  await fetch(buildSpotifyUrl('/me/player'), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ device_ids: [deviceId], play: false }),
  })
}

const playSpotifyTrack = async (trackUri: string, deviceId: string | null): Promise<void> => {
  const token = getSpotifyAccessToken()
  if (!token) {
    throw new Error('Missing Spotify access token.')
  }
  if (!deviceId) {
    throw new Error('Spotify device not ready.')
  }

  const url = new URL(buildSpotifyUrl('/me/player/play'))
  url.searchParams.set('device_id', deviceId)

  await fetch(url.toString(), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uris: [trackUri] }),
  })
}

class SpotifyPlaybackAdapter implements PlaybackAdapter {
  platform = 'spotify' as const
  capabilities = capabilities
  private player: SpotifyPlayer | null = null
  private state: PlaybackState = { ...DEFAULT_STATE }
  private listeners = new Set<PlaybackStateListener>()
  private isConnecting = false

  getState(): PlaybackState {
    return this.state
  }

  onStateChange(listener: PlaybackStateListener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async connect(): Promise<void> {
    if (this.player || this.isConnecting) {
      return
    }

    const token = getSpotifyAccessToken()
    if (!token) {
      throw new Error('Missing Spotify access token. Please reconnect to Spotify.')
    }

    this.isConnecting = true
    try {
      await loadSpotifySdk()

      if (!window.Spotify?.Player) {
        throw new Error('Spotify SDK unavailable after loading.')
      }

      this.player = new window.Spotify.Player({
        name: 'Zazam Web Player',
        getOAuthToken: (cb) => cb(getSpotifyAccessToken()),
        volume: 0.8,
      })

      this.player.addListener('ready', async ({ device_id }: { device_id: string }) => {
        this.state = { ...this.state, isReady: true, deviceId: device_id }
        this.notify()
        try {
          await transferPlayback(device_id)
        } catch (error) {
          console.log('[SpotifyPlayback] Transfer playback failed', error)
        }
      })

      this.player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        if (this.state.deviceId === device_id) {
          this.state = { ...this.state, isReady: false }
          this.notify()
        }
      })

      this.player.addListener('player_state_changed', (playerState: SpotifyPlayerState | null) => {
        if (!playerState) {
          return
        }
        this.state = {
          ...this.state,
          isPlaying: !playerState.paused,
          positionMs: playerState.position,
          durationMs: playerState.duration,
          track: this.mapTrack(playerState),
        }
        this.notify()
      })

      this.player.addListener('initialization_error', ({ message }: { message: string }) => {
        console.log('[SpotifyPlayback] Initialization error', message)
      })

      this.player.addListener('authentication_error', ({ message }: { message: string }) => {
        console.log('[SpotifyPlayback] Authentication error', message)
      })

      this.player.addListener('account_error', ({ message }: { message: string }) => {
        console.log('[SpotifyPlayback] Account error', message)
      })

      const connected = await this.player.connect()
      this.state = { ...this.state, isConnected: connected }
      this.notify()

      const initialState = await this.player.getCurrentState()
      if (initialState) {
        this.state = {
          ...this.state,
          isPlaying: !initialState.paused,
          positionMs: initialState.position,
          durationMs: initialState.duration,
          track: this.mapTrack(initialState),
        }
        this.notify()
      }
    } finally {
      this.isConnecting = false
    }
  }

  async disconnect(): Promise<void> {
    if (!this.player) {
      return
    }
    this.player.disconnect()
    this.player = null
    this.state = { ...DEFAULT_STATE }
    this.notify()
  }

  async play(): Promise<void> {
    if (!this.player) {
      throw new Error('Spotify player not ready.')
    }
    await this.player.resume()
  }

  async pause(): Promise<void> {
    if (!this.player) {
      throw new Error('Spotify player not ready.')
    }
    await this.player.pause()
  }

  async togglePlay(): Promise<void> {
    if (!this.player) {
      throw new Error('Spotify player not ready.')
    }
    await this.player.togglePlay()
  }

  async playTrack(trackUri: string): Promise<void> {
    if (!trackUri) {
      throw new Error('Missing track URI.')
    }
    if (!this.player) {
      throw new Error('Spotify player not ready.')
    }
    await playSpotifyTrack(trackUri, this.state.deviceId)
  }

  async seek(positionMs: number): Promise<void> {
    if (!this.player) {
      throw new Error('Spotify player not ready.')
    }
    await this.player.seek(positionMs)
  }

  private mapTrack(playerState: SpotifyPlayerState): PlaybackTrack | null {
    const track = playerState.track_window.current_track
    if (!track) {
      return null
    }
    return {
      id: track.id,
      title: track.name,
      artist: track.artists.map((artist) => artist.name).join(', ') || 'Unknown artist',
      album: track.album?.name,
      coverUrl: track.album?.images?.[0]?.url ?? DEFAULT_COVER,
      durationMs: playerState.duration,
    }
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state))
  }
}

export const spotifyPlaybackAdapter = new SpotifyPlaybackAdapter()
