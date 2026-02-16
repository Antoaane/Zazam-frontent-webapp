import type { UserLibraryLikesAdapter } from '../UserLibraryLikesAdapter'
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

export const tidalUserLibraryLikesAdapter: UserLibraryLikesAdapter = {
  async getLikedTracks({ limit, cursor }): Promise<UserLibraryPage<UserTrack>> {
    const { userId, countryCode, locale } = await getTidalUserContext()
    console.log('[TIDAL] getLikedTracks', { limit, cursor, userId })

    const response = await fetchTidalJson<TidalDocument<TidalResourceIdentifier[]>>(
      `/userCollections/${userId}/relationships/tracks`,
      {
        'page[cursor]': cursor ?? undefined,
        include: ['tracks'],
        locale,
        countryCode: countryCode ?? undefined,
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
