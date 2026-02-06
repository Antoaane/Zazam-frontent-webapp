<script lang="ts" setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronLeft } from 'lucide-vue-next'
import Item from '@/components/Item/Item.vue'
import type { UserPlaylist, UserTrack } from '@/domain/userLibrary/UserLibraryAdapter'

const props = defineProps<{
  playlist: UserPlaylist | null
  tracks: UserTrack[]
  isLoading: boolean
  hasMore: boolean
  error: string | null
}>()

const emit = defineEmits<{
  (event: 'back'): void
  (event: 'load-more'): void
  (event: 'play-track', track: UserTrack): void
}>()

const listRef = ref<HTMLDivElement | null>(null)
const sentinelRef = ref<HTMLDivElement | null>(null)
let observer: IntersectionObserver | null = null

const canLoadMore = () => Boolean(props.playlist && props.hasMore && !props.isLoading)

const handleIntersection: IntersectionObserverCallback = (entries) => {
  if (entries.some((entry) => entry.isIntersecting) && canLoadMore()) {
    emit('load-more')
  }
}

const setupObserver = () => {
  if (!listRef.value || !sentinelRef.value) {
    return
  }
  observer?.disconnect()
  observer = new IntersectionObserver(handleIntersection, {
    root: listRef.value,
    rootMargin: '0px 0px 200px 0px',
    threshold: 0,
  })
  observer.observe(sentinelRef.value)
}

onMounted(() => {
  nextTick(setupObserver)
})
onBeforeUnmount(() => observer?.disconnect())

watch(
  () => props.playlist?.id,
  () => {
    if (listRef.value) {
      listRef.value.scrollTop = 0
    }
    nextTick(setupObserver)
  },
)

watch(
  () => props.tracks.length,
  () => {
    nextTick(setupObserver)
  },
)

const handleTrackClick = (track: UserTrack) => {
  emit('play-track', track)
}
</script>

<template>
  <div class="playlist-tracks-tab">
    <div class="px-2 py-1 flex justify-between items-center gap-3">
      <div v-if="playlist" class="flex items-center gap-3 min-w-0">
        <img
          :src="playlist.coverUrl"
          :alt="playlist.title"
          class="h-12 w-12 rounded-full shadow-md"
        />
        <div class="min-w-0">
          <p class="text-primary text-lg font-medium truncate">{{ playlist.title }}</p>
          <p class="text-primary/60 text-sm truncate">{{ playlist.subtitle }}</p>
        </div>
      </div>
      <p v-else class="text-primary/60 text-sm">Select a playlist to see tracks.</p>
      <button
        class="glass rounded-full h-10 aspect-square flex items-center justify-center"
        type="button"
        @click="emit('back')"
      >
        <ChevronLeft :size="24" />
      </button>
    </div>

    <div ref="listRef" class="flex-1 overflow-y-auto flex flex-col gap-2 rounded-t-xl">
      <Item
        v-for="track in tracks"
        :key="track.id"
        :imageSrc="track.coverUrl"
        :title="track.title"
        :subtitle="track.subtitle"
        :draggable="false"
        @click="handleTrackClick(track)"
      />
      <p
        v-if="!isLoading && tracks.length === 0 && playlist && !error"
        class="text-xs text-primary/60 text-center py-6"
      >
        No tracks found.
      </p>
      <div v-if="error" class="text-xs text-primary/70 glass rounded-xl px-3 py-2">
        {{ error }}
      </div>
      <div ref="sentinelRef" class="h-6"></div>
      <p v-if="isLoading" class="text-xs text-primary/60 text-center py-3">Loading tracks...</p>
    </div>
  </div>
</template>

<style lang="scss">
@use '@/styles/variables/main-vars.scss' as *;

.lucide-chevron-left {
  stroke: $primary;
}
</style>
