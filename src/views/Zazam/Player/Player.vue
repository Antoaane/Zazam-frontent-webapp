<script lang="ts" setup>
import { Pause, Play } from 'lucide-vue-next'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { playbackFacade } from '@/domain/playback/PlaybackFacade'

const state = ref(playbackFacade.getState())
const isPlaying = computed(() => state.value.isPlaying)
const isReady = computed(() => state.value.isReady && state.value.isConnected)
const coverUrl = computed(() => state.value.track?.coverUrl ?? '/images/test/song-cover.png')
const title = computed(() => state.value.track?.title ?? 'No track playing')
const artist = computed(() => state.value.track?.artist ?? 'Connect to Spotify')

let unsubscribe: (() => void) | null = null

const handleToggle = async () => {
  try {
    await playbackFacade.togglePlay()
  } catch (error) {
    console.log('[Player] Toggle play failed', error)
  }
}

onMounted(async () => {
  unsubscribe = playbackFacade.onStateChange((nextState) => {
    state.value = nextState
  })
  try {
    await playbackFacade.initialize()
  } catch (error) {
    console.log('[Player] Playback init failed', error)
  }
})

onBeforeUnmount(() => {
  unsubscribe?.()
  unsubscribe = null
})
</script>

<template>
  <div class="flex-1 min-w-0 flex gap-3">
    <div class="flex-1 h-full min-w-0 p-2 flex rounded-full glass">
      <img
        :src="coverUrl"
        alt="song cover"
        class="h-full w-auto aspect-square rounded-full border border-primary/50"
      />
      <div class="flex flex-col ml-3 justify-center min-w-0">
        <p class="font-medium! text-lg text-primary truncate">{{ title }}</p>
        <p class="font-base text-sm text-primary/60 truncate">{{ artist }}</p>
      </div>
    </div>

    <button
      class="play-pause h-full aspect-square flex items-center justify-center bg-primary rounded-full"
      type="button"
      :disabled="!isReady"
      @click="handleToggle"
    >
      <Pause v-if="isPlaying" :size="28" />
      <Play v-else :size="28" />
    </button>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables/main-vars.scss' as *;
.play-pause {
  svg {
    stroke: $spotify;
  }
}
</style>
