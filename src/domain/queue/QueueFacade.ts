import type { PlaybackState } from '../playback/PlaybackAdapter'
import { playbackFacade } from '../playback/PlaybackFacade'
import { userLibraryFacade } from '../userLibrary/UserLibraryFacade'
import type { UserTrack } from '../userLibrary/UserLibraryAdapter'
import { useQueueStore } from './QueueStore'
import type { QueueTrack } from './QueueTypes'

const END_THRESHOLD_MS = 1200

const toQueueTrack = (track: UserTrack): QueueTrack => {
  const [artistPart] = track.subtitle.split(' - ')
  return {
    id: track.id,
    uri: track.uri,
    title: track.title,
    artist: artistPart || track.subtitle || 'Unknown artist',
    coverUrl: track.coverUrl,
    durationMs: track.durationMs,
  }
}

const findTrackIndex = (tracks: UserTrack[], selectedId: string): number => {
  return tracks.findIndex((track) => track.id === selectedId || track.uri === selectedId)
}

class QueueFacade {
  private initialized = false
  private unsubscribe: (() => void) | null = null
  private lastEndedTrackId: string | null = null
  private buildId = 0

  private getStore() {
    return useQueueStore()
  }

  initialize(): void {
    if (this.initialized) {
      return
    }
    this.initialized = true
    this.unsubscribe = playbackFacade.onStateChange((state) => this.handlePlaybackState(state))
  }

  destroy(): void {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.initialized = false
  }

  async replaceQueueFromPlaylist(playlistId: string, selectedTrackId: string): Promise<void> {
    this.initialize()
    const store = this.getStore()
    if (store.isReadOnly) {
      console.log('[Queue] Replace ignored (read-only)')
      return
    }

    try {
      await playbackFacade.initialize()
    } catch (error) {
      console.log('[Queue] Playback init failed', error)
    }

    const tracksState = userLibraryFacade.getPlaylistTracksState(playlistId)
    const tracks = tracksState.items
    const startIndex = findTrackIndex(tracks, selectedTrackId)

    if (startIndex < 0) {
      console.log('[Queue] Selected track not found in loaded playlist', {
        playlistId,
        selectedTrackId,
      })
      return
    }

    const queueTracks = tracks.slice(startIndex).map(toQueueTrack)
    store.replaceQueue(queueTracks, 0)
    this.lastEndedTrackId = null

    const selectedTrack = tracks[startIndex]
    if (selectedTrack?.uri) {
      try {
        await playbackFacade.playTrack(selectedTrack.uri)
      } catch (error) {
        console.log('[Queue] Play track failed', error)
      }
    } else {
      console.log('[Queue] Selected track missing uri, cannot play', selectedTrack)
    }

    const currentBuildId = ++this.buildId

    const fullTracks = await userLibraryFacade.loadAllPlaylistTracks(playlistId)
    if (currentBuildId !== this.buildId) {
      return
    }
    const fullStartIndex = findTrackIndex(fullTracks, selectedTrackId)
    if (fullStartIndex >= 0) {
      store.replaceQueue(fullTracks.slice(fullStartIndex).map(toQueueTrack), 0)
    }
  }

  private handlePlaybackState(state: PlaybackState): void {
    const store = this.getStore()
    if (store.isReadOnly) {
      return
    }
    if (!state.track) {
      return
    }

    const queueItems = store.items
    const currentIndex = store.currentIndex
    const playbackTrackId = state.track.id
    store.setPlaybackProgress(playbackTrackId, state.positionMs)
    const matchIndex = queueItems.findIndex(
      (track) =>
        track.id === playbackTrackId ||
        (track.uri ? track.uri.endsWith(`:${playbackTrackId}`) : false),
    )

    if (matchIndex >= 0 && matchIndex !== currentIndex) {
      store.setCurrentIndex(matchIndex)
    }

    const isNearEnd =
      state.durationMs > 0 && state.positionMs >= state.durationMs - END_THRESHOLD_MS
    const isCurrentTrack = matchIndex === currentIndex

    if (isNearEnd && isCurrentTrack) {
      if (this.lastEndedTrackId === playbackTrackId) {
        return
      }
      this.lastEndedTrackId = playbackTrackId
      store.advance()
      const nextTrack = store.currentTrack
      if (nextTrack?.uri) {
        playbackFacade.playTrack(nextTrack.uri).catch((error) => {
          console.log('[Queue] Play next track failed', error)
        })
      } else if (nextTrack) {
        console.log('[Queue] Next track missing uri, cannot play', nextTrack)
      }
    }
  }
}

export const queueFacade = new QueueFacade()
