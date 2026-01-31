<script lang="ts" setup>
import Item from '@/components/Item/Item.vue'
import type { UserPlaylist } from '@/domain/userLibrary/UserLibraryAdapter'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps<{
  playlists: UserPlaylist[]
  isLoading: boolean
  hasMore: boolean
  error: string | null
}>()

const emit = defineEmits<{
  (event: 'select', playlist: UserPlaylist): void
  (event: 'load-more'): void
}>()

const listRef = ref<HTMLDivElement | null>(null)
const sentinelRef = ref<HTMLDivElement | null>(null)
let observer: IntersectionObserver | null = null

const canLoadMore = () => props.hasMore && !props.isLoading

const handleIntersection: IntersectionObserverCallback = (entries) => {
  if (entries.some((entry) => entry.isIntersecting) && canLoadMore()) {
    console.log('[PlaylistList] Intersection reached, loading more playlists')
    emit('load-more')
  }
}

const setupObserver = () => {
  if (!listRef.value || !sentinelRef.value) {
    return
  }
  console.log('[PlaylistList] Setup observer')
  observer?.disconnect()
  observer = new IntersectionObserver(handleIntersection, {
    root: listRef.value,
    rootMargin: '0px 0px 200px 0px',
    threshold: 0,
  })
  observer.observe(sentinelRef.value)
}

onMounted(setupObserver)
onBeforeUnmount(() => {
  console.log('[PlaylistList] Disconnect observer')
  observer?.disconnect()
})

const handleSelect = (playlist: UserPlaylist) => {
  console.log('[PlaylistList] Select playlist', { playlistId: playlist.id })
  emit('select', playlist)
}
</script>

<template>
  <div class="playlist-list-tab">
    <div ref="listRef" class="flex-1 overflow-y-auto flex flex-col gap-2">
      <Item
        v-for="playlist in playlists"
        :key="playlist.id"
        :imageSrc="playlist.coverUrl"
        :title="playlist.title"
        :subtitle="playlist.subtitle"
        :draggable="false"
        @click="handleSelect(playlist)"
      />
      <p
        v-if="!isLoading && playlists.length === 0 && !error"
        class="text-sm text-primary/60 text-center py-6"
      >
        No playlists found.
      </p>
      <div v-if="error" class="text-xs text-primary/70 glass rounded-xl px-3 py-2">
        {{ error }}
      </div>
      <div ref="sentinelRef" class="h-6"></div>
      <p v-if="isLoading" class="text-xs text-primary/60 text-center py-3">Loading playlists...</p>
    </div>
  </div>
</template>

<style lang="scss"></style>
