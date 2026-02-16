import type { UserLibraryCursor, UserLibraryPage, UserPlaylist, UserTrack } from '../../UserLibraryAdapter'
import { getTidalAccessToken } from '@/domain/tidal/tidalAuth'

const TIDAL_API_BASE = 'https://openapi.tidal.com/v2'
const DEFAULT_COVER = '/images/test/pl-cover.png'

type TidalLinks = {
  next?: string
  meta?: {
    nextCursor?: string
  }
}

type TidalDocument<T> = {
  data?: T
  included?: TidalResource[]
  links?: TidalLinks
}

type TidalResource<T = Record<string, unknown>> = {
  id: string
  type: string
  attributes?: T
  relationships?: Record<string, { data?: TidalResourceIdentifier | TidalResourceIdentifier[] }>
}

type TidalResourceIdentifier = {
  id: string
  type: string
  meta?: Record<string, unknown>
}

type TidalArtworkAttributes = {
  files?: Array<{ href: string; meta?: { width?: number; height?: number } }>
}

type TidalPlaylistAttributes = {
  name?: string
  numberOfItems?: number
}

type TidalTrackAttributes = {
  title?: string
  duration?: string
  artist?: { name?: string }
  artists?: Array<{ name?: string }>
  album?: { id?: string; cover?: string; coverArt?: string; coverUrl?: string }
  albumId?: string
  cover?: string
  image?: string
}

type TidalArtistAttributes = {
  name?: string
}

type TidalUserAttributes = {
  country?: string
}

export type TidalUserContext = {
  userId: string
  countryCode?: string
  locale: string
}

let cachedUserContext: TidalUserContext | null = null

const buildTidalUrl = (
  path: string,
  params: Record<string, string | number | string[] | undefined> = {},
): string => {
  const url = new URL(`${TIDAL_API_BASE}${path}`)
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return
    }
    if (Array.isArray(value)) {
      if (value.length > 0) {
        url.searchParams.set(key, value.join(','))
      }
      return
    }
    url.searchParams.set(key, String(value))
  })
  return url.toString()
}

export const fetchTidalJson = async <T>(
  path: string,
  params: Record<string, string | number | string[] | undefined> = {},
): Promise<T> => {
  const token = await getTidalAccessToken()

  const url = buildTidalUrl(path, params)
  console.log('[TIDAL] Fetch', { path, url, params })

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.api+json',
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
    console.log('[TIDAL] Fetch error', {
      status: response.status,
      statusText: response.statusText,
      body: responseBody,
    })
    throw new Error(
      `TIDAL request failed (${response.status}). ${
        typeof responseBody === 'string' && responseBody ? responseBody : 'Please try again later.'
      }`,
    )
  }

  const data = (await response.json()) as T
  console.log('[TIDAL] Fetch success', { path, data, body: responseBody })
  return data
}

export const getTidalUserContext = async (): Promise<TidalUserContext> => {
  if (cachedUserContext) {
    return cachedUserContext
  }

  const response = await fetchTidalJson<TidalDocument<TidalResource<TidalUserAttributes>>>('/users/me')
  const user = response.data
  if (!user) {
    throw new Error('TIDAL user profile not available.')
  }

  const countryCode = user.attributes?.country
  const locale =
    typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US'

  cachedUserContext = {
    userId: user.id,
    countryCode,
    locale,
  }

  return cachedUserContext
}

export const getNextCursor = (links?: TidalLinks): UserLibraryCursor => {
  if (!links) {
    return null
  }
  if (links.meta?.nextCursor) {
    return links.meta.nextCursor
  }
  if (links.next) {
    try {
      const url = new URL(links.next, TIDAL_API_BASE)
      return url.searchParams.get('page[cursor]')
    } catch {
      return null
    }
  }
  return null
}

export const hasMoreFromLinks = (links?: TidalLinks): boolean =>
  Boolean(links?.next || links?.meta?.nextCursor)

export const createIncludedMap = (
  ...resources: Array<TidalResource[] | undefined>
): Map<string, TidalResource> => {
  const map = new Map<string, TidalResource>()
  resources.forEach((list) => {
    list?.forEach((resource) => {
      map.set(`${resource.type}:${resource.id}`, resource)
    })
  })
  return map
}

const getFirstIdentifier = (
  data?: TidalResourceIdentifier | TidalResourceIdentifier[],
): TidalResourceIdentifier | null => {
  if (!data) {
    return null
  }
  if (Array.isArray(data)) {
    return data[0] ?? null
  }
  return data
}

const getIdentifiers = (
  data?: TidalResourceIdentifier | TidalResourceIdentifier[],
): TidalResourceIdentifier[] => {
  if (!data) {
    return []
  }
  return Array.isArray(data) ? data : [data]
}

const getRelationshipIdentifiers = (
  resource: TidalResource,
  keys: string[],
): TidalResourceIdentifier[] => {
  const identifiers: TidalResourceIdentifier[] = []
  keys.forEach((key) => {
    const data = resource.relationships?.[key]?.data
    identifiers.push(...getIdentifiers(data))
  })
  return identifiers
}

const resolveArtworkUrl = (
  identifiers: TidalResourceIdentifier[] | undefined,
  included: Map<string, TidalResource>,
): string | null => {
  const first = identifiers?.[0]
  if (!first) {
    return null
  }
  const artwork = included.get(`artworks:${first.id}`) as TidalResource<TidalArtworkAttributes> | undefined
  const files = artwork?.attributes?.files ?? []
  if (files.length === 0) {
    return null
  }
  const best = files.reduce<(typeof files)[number] | null>((current, candidate) => {
    if (!current) {
      return candidate
    }
    const currentWidth = current.meta?.width ?? 0
    const candidateWidth = candidate.meta?.width ?? 0
    return candidateWidth >= currentWidth ? candidate : current
  }, null)
  return best?.href ?? null
}

const isAbsoluteUrl = (value?: string): boolean =>
  Boolean(value && (value.startsWith('http://') || value.startsWith('https://')))

const toTidalImageUrl = (value: string): string => {
  if (isAbsoluteUrl(value)) {
    return value
  }
  const path = value.replace(/-/g, '/')
  return `https://resources.tidal.com/images/${path}/640x640.jpg`
}

const resolveArtistNames = (
  track: TidalResource,
  included: Map<string, TidalResource>,
  options?: { artistNameMap?: Map<string, string> },
): string[] => {
  const identifiers = getRelationshipIdentifiers(track, ['artists', 'artist'])
  const namesFromIncluded = identifiers
    .map((identifier) => {
      const artist = included.get(`artists:${identifier.id}`) as
        | TidalResource<TidalArtistAttributes>
        | undefined
      return artist?.attributes?.name
    })
    .filter((name): name is string => Boolean(name))

  if (namesFromIncluded.length > 0) {
    return namesFromIncluded
  }

  if (options?.artistNameMap && identifiers.length > 0) {
    const fromMap = identifiers
      .map((identifier) => options.artistNameMap?.get(identifier.id))
      .filter((name): name is string => Boolean(name))
    if (fromMap.length > 0) {
      return fromMap
    }
  }

  const attributes = track.attributes as TidalTrackAttributes | undefined
  const fromAttributes =
    attributes?.artists?.map((artist) => artist?.name).filter((name): name is string => Boolean(name)) ??
    []
  if (fromAttributes.length > 0) {
    return fromAttributes
  }
  if (attributes?.artist?.name) {
    return [attributes.artist.name]
  }
  return []
}

const resolveTrackCoverUrl = (
  track: TidalResource,
  included: Map<string, TidalResource>,
): string | null => {
  const albumIdentifier = getFirstIdentifier(
    track.relationships?.albums?.data ?? track.relationships?.album?.data,
  )
  if (!albumIdentifier) {
    const attributes = track.attributes as TidalTrackAttributes | undefined
    const candidate =
      attributes?.album?.coverUrl ??
      attributes?.album?.coverArt ??
      attributes?.album?.cover ??
      attributes?.cover ??
      attributes?.image
    return candidate ? toTidalImageUrl(candidate) : null
  }
  const album = included.get(`albums:${albumIdentifier.id}`)
  const coverIdentifier = getFirstIdentifier(album?.relationships?.coverArt?.data)
  if (!coverIdentifier) {
    return null
  }
  return resolveArtworkUrl([coverIdentifier], included)
}

const resolvePlaylistCoverUrl = (
  playlist: TidalResource,
  included: Map<string, TidalResource>,
): string | null => {
  const identifiers = getIdentifiers(playlist.relationships?.coverArt?.data)
  return resolveArtworkUrl(identifiers, included)
}

const formatTrackCountLabel = (count: number): string => {
  if (count === 1) {
    return '1 song'
  }
  return `${count} songs`
}

const parseIsoDurationMs = (value?: string): number | undefined => {
  if (!value) {
    return undefined
  }
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?/.exec(value)
  if (!match) {
    return undefined
  }
  const hours = Number(match[1] ?? 0)
  const minutes = Number(match[2] ?? 0)
  const seconds = Number(match[3] ?? 0)
  if (Number.isNaN(hours) || Number.isNaN(minutes) || Number.isNaN(seconds)) {
    return undefined
  }
  return Math.round((hours * 3600 + minutes * 60 + seconds) * 1000)
}

export const mapTidalPlaylist = (
  playlist: TidalResource,
  included: Map<string, TidalResource>,
): UserPlaylist => {
  const attributes = playlist.attributes as TidalPlaylistAttributes | undefined
  const tracksCount = attributes?.numberOfItems ?? 0
  const coverUrl = resolvePlaylistCoverUrl(playlist, included) ?? DEFAULT_COVER

  return {
    id: playlist.id,
    title: attributes?.name ?? 'Untitled playlist',
    subtitle: formatTrackCountLabel(tracksCount),
    coverUrl,
    tracksCount,
  }
}

export const mapTidalTrack = (
  track: TidalResource,
  included: Map<string, TidalResource>,
  options?: { albumCoverMap?: Map<string, string>; artistNameMap?: Map<string, string> },
): UserTrack => {
  const attributes = track.attributes as TidalTrackAttributes | undefined
  const artists = resolveArtistNames(track, included, { artistNameMap: options?.artistNameMap })
  const subtitle = artists.length > 0 ? artists.join(', ') : 'Unknown artist'
  const albumIdentifier = getFirstIdentifier(
    track.relationships?.albums?.data ?? track.relationships?.album?.data,
  )
  const coverOverride =
    albumIdentifier && options?.albumCoverMap ? options.albumCoverMap.get(albumIdentifier.id) : undefined
  const coverUrl = coverOverride ?? resolveTrackCoverUrl(track, included) ?? DEFAULT_COVER

  return {
    id: track.id,
    title: attributes?.title ?? 'Unknown title',
    subtitle,
    coverUrl,
    uri: `tidal:track:${track.id}`,
    durationMs: parseIsoDurationMs(attributes?.duration),
  }
}

export const toPage = <T>(items: T[], links?: TidalLinks): UserLibraryPage<T> => {
  const nextCursor = getNextCursor(links)
  const hasMore = hasMoreFromLinks(links)
  return {
    items,
    nextCursor,
    hasMore,
  }
}

export type { TidalDocument, TidalResource, TidalResourceIdentifier, TidalLinks }

const uniqueIds = (ids: Array<string | null | undefined>): string[] => {
  const set = new Set<string>()
  ids.forEach((id) => {
    if (id) {
      set.add(id)
    }
  })
  return Array.from(set)
}

export const buildAlbumCoverMap = async (
  albumIds: Array<string | null | undefined>,
  countryCode?: string,
): Promise<Map<string, string>> => {
  const uniqueAlbumIds = uniqueIds(albumIds)
  if (uniqueAlbumIds.length === 0) {
    return new Map()
  }

  const response = await fetchTidalJson<TidalDocument<TidalResource[]>>('/albums', {
    'filter[id]': uniqueAlbumIds,
    include: ['coverArt'],
    countryCode: countryCode ?? undefined,
  })

  const resourceMap = createIncludedMap(response.data ?? [], response.included ?? [])
  const coverMap = new Map<string, string>()

  uniqueAlbumIds.forEach((albumId) => {
    const album = resourceMap.get(`albums:${albumId}`)
    if (!album) {
      return
    }
    const coverIdentifiers = getIdentifiers(album.relationships?.coverArt?.data)
    const coverUrl = resolveArtworkUrl(coverIdentifiers, resourceMap)
    if (coverUrl) {
      coverMap.set(albumId, coverUrl)
    }
  })

  return coverMap
}

export const extractAlbumIds = (tracks: TidalResource[]): string[] => {
  const ids: string[] = []
  tracks.forEach((track) => {
    const identifiers = getRelationshipIdentifiers(track, ['albums', 'album'])
    identifiers.forEach((identifier) => {
      ids.push(identifier.id)
    })
    const attributes = track.attributes as TidalTrackAttributes | undefined
    if (attributes?.album?.id) {
      ids.push(attributes.album.id)
    }
    if (attributes?.albumId) {
      ids.push(attributes.albumId)
    }
  })
  return ids
}

export const extractArtistIds = (tracks: TidalResource[]): string[] => {
  const ids: string[] = []
  tracks.forEach((track) => {
    const identifiers = getRelationshipIdentifiers(track, ['artists', 'artist'])
    identifiers.forEach((identifier) => {
      ids.push(identifier.id)
    })
  })
  return ids
}

export const buildArtistNameMap = async (
  artistIds: Array<string | null | undefined>,
  countryCode?: string,
): Promise<Map<string, string>> => {
  const uniqueArtistIds = uniqueIds(artistIds)
  if (uniqueArtistIds.length === 0) {
    return new Map()
  }

  const response = await fetchTidalJson<TidalDocument<TidalResource[]>>('/artists', {
    'filter[id]': uniqueArtistIds,
    countryCode: countryCode ?? undefined,
  })

  const artistNameMap = new Map<string, string>()
  response.data?.forEach((artist) => {
    const attributes = artist.attributes as TidalArtistAttributes | undefined
    if (attributes?.name) {
      artistNameMap.set(artist.id, attributes.name)
    }
  })

  return artistNameMap
}
