import type {
  UserLibraryAdapter,
  UserLibraryPage,
  UserPlaylist,
  UserTrack,
} from '../UserLibraryAdapter'
import {
  buildAlbumCoverMap,
  buildArtistNameMap,
  createIncludedMap,
  extractAlbumIds,
  extractArtistIds,
  fetchTidalJson,
  getTidalUserContext,
  mapTidalPlaylist,
  mapTidalTrack,
  toPage,
  type TidalDocument,
  type TidalResourceIdentifier,
  type TidalResource,
} from './tidal/tidalUserLibraryShared'

export const tidalUserLibraryAdapter: UserLibraryAdapter = {
  async getPlaylists({ limit, cursor }): Promise<UserLibraryPage<UserPlaylist>> {
    const { userId, countryCode } = await getTidalUserContext()
    console.log('[TIDAL] getPlaylists', { limit, cursor, userId })

    const response = await fetchTidalJson<TidalDocument<TidalResourceIdentifier[]>>(
      `/userCollections/${userId}/relationships/playlists`,
      {
        'page[cursor]': cursor ?? undefined,
        include: ['playlists'],
      },
    )

    const playlistIds = (response.data ?? []).map((item) => item.id)
    if (playlistIds.length === 0) {
      return toPage([], response.links)
    }

    const playlistsResponse = await fetchTidalJson<TidalDocument<TidalResource[]>>('/playlists', {
      'filter[id]': playlistIds,
      include: ['coverArt'],
      countryCode: countryCode ?? undefined,
    })

    const included = createIncludedMap(playlistsResponse.included)
    const playlistById = new Map<string, TidalResource>()
    playlistsResponse.data?.forEach((playlist) => {
      playlistById.set(playlist.id, playlist)
    })

    const playlists = playlistIds
      .map((playlistId) => playlistById.get(playlistId))
      .filter((playlist): playlist is TidalResource => Boolean(playlist))
      .map((playlist) => mapTidalPlaylist(playlist, included))

    return toPage(playlists, response.links)
  },

  async getPlaylistTracks({ playlistId, limit, cursor }): Promise<UserLibraryPage<UserTrack>> {
    const { countryCode } = await getTidalUserContext()
    console.log('[TIDAL] getPlaylistTracks', { playlistId, limit, cursor })

    const response = await fetchTidalJson<TidalDocument<TidalResourceIdentifier[]>>(
      `/playlists/${playlistId}/relationships/items`,
      {
        'page[cursor]': cursor ?? undefined,
        include: ['items'],
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
