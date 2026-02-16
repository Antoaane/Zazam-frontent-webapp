import type { UserLibrarySearchAdapter } from '../UserLibrarySearchAdapter'
import type { UserLibraryPage, UserTrack } from '../UserLibraryAdapter'
import {
  buildAlbumCoverMap,
  buildArtistNameMap,
  createIncludedMap,
  extractAlbumIds,
  extractArtistIds,
  fetchTidalJson,
  getTidalUserContext,
  mapTidalTrack,
  toPage,
  type TidalDocument,
  type TidalResource,
  type TidalResourceIdentifier,
} from './tidal/tidalUserLibraryShared'

export const tidalUserLibrarySearchAdapter: UserLibrarySearchAdapter = {
  async searchTracks({ query, limit, cursor }): Promise<UserLibraryPage<UserTrack>> {
    const { countryCode } = await getTidalUserContext()
    console.log('[TIDAL] searchTracks', { query, limit, cursor })

    if (!query.trim()) {
      return { items: [], nextCursor: null, hasMore: false }
    }

    const encodedQuery = encodeURIComponent(query.trim())
    const response = await fetchTidalJson<TidalDocument<TidalResourceIdentifier[]>>(
      `/searchResults/${encodedQuery}/relationships/tracks`,
      {
        'page[cursor]': cursor ?? undefined,
        include: ['tracks'],
        countryCode: countryCode ?? 'US',
      },
    )

    const trackIds = (response.data ?? []).filter((item) => item.type === 'tracks').map((item) => item.id)
    if (trackIds.length === 0) {
      return toPage([], response.links)
    }

    const tracksResponse = await fetchTidalJson<TidalDocument<TidalResource[]>>('/tracks', {
      'filter[id]': trackIds,
      include: ['artists', 'albums'],
      countryCode: countryCode ?? undefined,
    })

    const included = createIncludedMap(tracksResponse.included)
    const trackResources = tracksResponse.data ?? []
    const trackById = new Map<string, TidalResource>()
    trackResources.forEach((track) => trackById.set(track.id, track))
    const orderedTracks = trackIds
      .map((id) => trackById.get(id))
      .filter((track): track is TidalResource => Boolean(track))

    const albumIds = extractAlbumIds(orderedTracks)
    const albumCoverMap = await buildAlbumCoverMap(albumIds, countryCode ?? undefined)
    const artistIds = extractArtistIds(orderedTracks)
    const artistNameMap = await buildArtistNameMap(artistIds, countryCode ?? undefined)
    const tracks = orderedTracks.map((track) =>
      mapTidalTrack(track, included, { albumCoverMap, artistNameMap }),
    )

    return toPage(tracks, response.links)
  },
}
