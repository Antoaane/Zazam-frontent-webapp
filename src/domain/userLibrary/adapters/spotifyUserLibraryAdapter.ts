import type { UserLibraryAdapter, UserLibraryPage, UserPlaylist, UserTrack } from '../UserLibraryAdapter'

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1'
const DEFAULT_COVER = '/images/test/pl-cover.png'

type SpotifyImage = {
  url: string
}

type SpotifyPlaylist = {
  id: string
  name: string
  images?: SpotifyImage[]
  tracks?: { total?: number }
}

type SpotifyPagingResponse<T> = {
  items: T[]
  limit: number
  offset: number
  next: string | null
}

type SpotifyTrack = {
  id: string | null
  uri?: string
  name: string
  duration_ms?: number
  artists?: Array<{ name: string }>
  album?: { name?: string; images?: SpotifyImage[] }
}

type SpotifyPlaylistTrackItem = {
  track: SpotifyTrack | null
}

const getSpotifyAccessToken = (): string => {
  if (typeof window === 'undefined') {
    return ''
  }
  return localStorage.getItem('spotify_access_token') ?? ''
}

const formatTrackCountLabel = (count: number): string => {
  if (count === 1) {
    return '1 song'
  }
  return `${count} songs`
}

const buildSpotifyUrl = (path: string, params: Record<string, string | number | undefined>): string => {
  const url = new URL(`${SPOTIFY_API_BASE}${path}`)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

const fetchSpotifyJson = async <T>(path: string, params: Record<string, string | number | undefined>): Promise<T> => {
  const token = getSpotifyAccessToken()
  if (!token) {
    throw new Error('Missing Spotify access token. Please reconnect to Spotify.')
  }

  const url = buildSpotifyUrl(path, params)
  console.log('[Spotify] Fetch', { path, url, params })
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  const responseClone = response.clone()
  const responseText = await responseClone.text().catch(() => '')
  let responseBody: unknown = responseText
  if (responseText) {
    try {
      responseBody = JSON.parse(responseText)
    } catch {
      responseBody = responseText
    }
  }

  if (!response.ok) {
    console.log('[Spotify] Fetch error', {
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
    })
    throw new Error(
      `Spotify request failed (${response.status}). ${
        typeof responseBody === 'string' && responseBody
          ? responseBody
          : 'Please try again later.'
      }`,
    )
  }

  const data = (await response.json()) as T
  console.log('[Spotify] Fetch success', { path, data, body: responseBody })
  return data
}

const mapPlaylist = (playlist: SpotifyPlaylist): UserPlaylist => {
  const tracksCount = playlist.tracks?.total ?? 0

  return {
    id: playlist.id,
    title: playlist.name,
    subtitle: formatTrackCountLabel(tracksCount),
    coverUrl: playlist.images?.[0]?.url ?? DEFAULT_COVER,
    tracksCount,
  }
}

const mapTrack = (item: SpotifyPlaylistTrackItem): UserTrack | null => {
  if (!item.track) {
    return null
  }

  const artists = item.track.artists?.map((artist) => artist.name).filter(Boolean) ?? []
  const subtitleParts = artists.length ? [artists.join(', ')] : []

  return {
    id: item.track.id ?? item.track.uri ?? item.track.name,
    title: item.track.name,
    subtitle: subtitleParts.join(', ') || 'Unknown artist',
    coverUrl: item.track.album?.images?.[0]?.url ?? DEFAULT_COVER,
    uri: item.track.uri,
    durationMs: item.track.duration_ms,
  }
}

const toPage = <T>(response: SpotifyPagingResponse<T>): UserLibraryPage<T> => {
  const nextOffset = response.offset + response.limit
  const hasMore = Boolean(response.next)

  return {
    items: response.items,
    nextCursor: hasMore ? String(nextOffset) : null,
    hasMore,
  }
}

export const spotifyUserLibraryAdapter: UserLibraryAdapter = {
  async getPlaylists({ limit, cursor }) {
    const offset = cursor ? Number(cursor) : 0
    const safeOffset = Number.isFinite(offset) ? offset : 0
    console.log('[Spotify] getPlaylists', { limit, cursor, offset: safeOffset })
    const response = await fetchSpotifyJson<SpotifyPagingResponse<SpotifyPlaylist>>('/me/playlists', {
      limit,
      offset: safeOffset,
    })
    const page = toPage(response)

    return {
      ...page,
      items: page.items.map(mapPlaylist),
    }
  },

  async getPlaylistTracks({ playlistId, limit, cursor }) {
    const offset = cursor ? Number(cursor) : 0
    const safeOffset = Number.isFinite(offset) ? offset : 0
    console.log('[Spotify] getPlaylistTracks', { playlistId, limit, cursor, offset: safeOffset })
    const response = await fetchSpotifyJson<SpotifyPagingResponse<SpotifyPlaylistTrackItem>>(
      `/playlists/${playlistId}/tracks`,
      { limit, offset: safeOffset },
    )

    const page = toPage(response)
    return {
      ...page,
      items: page.items.map(mapTrack).filter((track): track is UserTrack => Boolean(track)),
    }
  },
}
