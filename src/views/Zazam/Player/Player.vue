<script lang="ts" setup>
import { Pause } from 'lucide-vue-next'
</script>

<template>
  <div class="flex-1 flex gap-3">
    <div class="flex-1 h-full p-2 flex rounded-full glass">
      <img
        src="/images/test/song-cover.png"
        alt="song cover"
        class="h-full w-auto aspect-square rounded-full border border-primary/50"
      />
      <div class="flex flex-col ml-3 justify-center min-w-0">
        <p class="font-medium! text-lg text-primary truncate">Song Title</p>
        <p class="font-base text-sm text-primary/60 truncate">Artist Name</p>
      </div>
    </div>

    <button
      class="play-pause h-full aspect-square flex items-center justify-center bg-primary rounded-full"
    >
      <Pause :size="28" />
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
