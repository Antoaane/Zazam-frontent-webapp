<script lang="ts" setup>
import { computed, ref } from 'vue'
// import { playbackFacade } from '@/domain/playback/PlaybackFacade'
// import { Pause, Play } from 'lucide-vue-next'

// const state = ref(playbackFacade.getState())
// const isPlaying = computed(() => state.value.isPlaying)

const props = defineProps<{
  imageSrc: string
  title: string
  subtitle: string
  draggable?: boolean
  isFirst?: boolean
}>()
</script>

<template>
  <button
    class="item h-19 p-2 flex gap-4 items-center justify-start rounded-xl first-of-type:rounded-t-4xl glass"
  >
    <img
      :src="props.imageSrc"
      :alt="props.title"
      class="h-full aspect-square rounded-md shadow-md"
    />
    <div class="flex flex-col w-full min-w-0">
      <p class="title flex-1 min-w-0 font-medium! text-lg text-primary truncate text-left">
        {{ props.title }}
      </p>
      <p class="subtitle font-base text-sm text-primary/60 text-left truncate">
        {{ props.subtitle }}
      </p>
    </div>
    <button
      v-if="props.draggable && !props.isFirst"
      class="px-3 flex flex-col gap-1 justify-center"
    >
      <span class="w-4 h-0.5 bg-primary/50 rounded-full"></span>
      <span class="w-4 h-0.5 bg-primary/50 rounded-full"></span>
      <span class="w-4 h-0.5 bg-primary/50 rounded-full"></span>
    </button>
    <!-- <button v-if="props.isFirst" class="px-3">
      <Pause v-if="isPlaying" :size="28" />
      <Play v-else :size="28" />
    </button> -->
  </button>
</template>

<style lang="scss">
@use '@/styles/variables/main-vars.scss' as *;

.item {
  .pause,
  .play {
    stroke: $secondary;
    display: block;
  }

  &:first-of-type {
    img {
      border-top-left-radius: 1.5rem;
    }
  }
}
</style>
