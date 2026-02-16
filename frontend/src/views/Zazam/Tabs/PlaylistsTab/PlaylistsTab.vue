<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import PlaylistList from '@/views/Zazam/Tabs/PlaylistsTab/PlaylistList.vue'
import PlaylistTracks from '@/views/Zazam/Tabs/PlaylistsTab/PlaylistTracks.vue'
import { userLibraryFacade } from '@/domain/userLibrary/UserLibraryFacade'
import { queueFacade } from '@/domain/queue/QueueFacade'
import type { UserPlaylist, UserTrack } from '@/domain/userLibrary/UserLibraryAdapter'

const viewMode = ref<'list' | 'detail'>('list')
const playlistsState = ref(userLibraryFacade.getPlaylistsState())
const selectedPlaylistId = ref<string | null>(null)
const tracksState = ref(
  selectedPlaylistId.value
    ? userLibraryFacade.getPlaylistTracksState(selectedPlaylistId.value)
    : null,
)

const selectedPlaylist = computed(() =>
  playlistsState.value.items.find((playlist) => playlist.id === selectedPlaylistId.value),
)

const refreshPlaylistsState = () => {
  console.log('[PlaylistsTab] Refresh playlists state')
  playlistsState.value = userLibraryFacade.getPlaylistsState()
}

const refreshTracksState = (playlistId: string) => {
  console.log('[PlaylistsTab] Refresh tracks state', { playlistId })
  tracksState.value = userLibraryFacade.getPlaylistTracksState(playlistId)
}

const loadMorePlaylists = async () => {
  console.log('[PlaylistsTab] Load more playlists requested')
  const pending = userLibraryFacade.loadNextPlaylistsPage()
  refreshPlaylistsState()
  playlistsState.value = await pending
  console.log('[PlaylistsTab] Load more playlists completed', {
    total: playlistsState.value.items.length,
    hasMore: playlistsState.value.hasMore,
  })
}

const loadMoreTracks = async () => {
  if (!selectedPlaylistId.value) {
    console.log('[PlaylistsTab] Load more tracks skipped (no playlist selected)')
    return
  }
  console.log('[PlaylistsTab] Load more tracks requested', {
    playlistId: selectedPlaylistId.value,
  })
  const pending = userLibraryFacade.loadNextPlaylistTracksPage(selectedPlaylistId.value)
  refreshTracksState(selectedPlaylistId.value)
  tracksState.value = await pending
  console.log('[PlaylistsTab] Load more tracks completed', {
    playlistId: selectedPlaylistId.value,
    total: tracksState.value?.items.length ?? 0,
    hasMore: tracksState.value?.hasMore ?? false,
  })
}

const handleSelectPlaylist = async (playlist: UserPlaylist) => {
  console.log('[PlaylistsTab] Select playlist', { playlistId: playlist.id })
  selectedPlaylistId.value = playlist.id
  viewMode.value = 'detail'
  refreshTracksState(playlist.id)

  if (tracksState.value && tracksState.value.items.length === 0 && tracksState.value.hasMore) {
    console.log('[PlaylistsTab] Auto-load first tracks page', { playlistId: playlist.id })
    await loadMoreTracks()
  }
}

const handleBackToList = () => {
  console.log('[PlaylistsTab] Back to list')
  viewMode.value = 'list'
}

const handlePlayTrack = async (track: UserTrack) => {
  if (!selectedPlaylistId.value) {
    console.log('[PlaylistsTab] Missing playlist selection for queue')
    return
  }
  await queueFacade.replaceQueueFromPlaylist(selectedPlaylistId.value, track.uri ?? track.id)
}

onMounted(async () => {
  console.log('[PlaylistsTab] Mounted')
  refreshPlaylistsState()

  if (playlistsState.value.items.length === 0) {
    await loadMorePlaylists()
  }
})
</script>

<template>
  <div class="playlist h-full min-h-0">
    <PlaylistList
      v-show="viewMode === 'list'"
      :playlists="playlistsState.items"
      :isLoading="playlistsState.isLoading"
      :hasMore="playlistsState.hasMore"
      :error="playlistsState.error"
      @select="handleSelectPlaylist"
      @load-more="loadMorePlaylists"
    />
    <PlaylistTracks
      v-show="viewMode === 'detail'"
      :playlist="selectedPlaylist ?? null"
      :tracks="tracksState?.items ?? []"
      :isLoading="tracksState?.isLoading ?? false"
      :hasMore="tracksState?.hasMore ?? false"
      :error="tracksState?.error ?? null"
      @back="handleBackToList"
      @load-more="loadMoreTracks"
      @play-track="handlePlayTrack"
    />
  </div>
</template>

<style lang="scss"></style>
