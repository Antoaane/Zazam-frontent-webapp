<script lang="ts" setup>
import Item from '@/components/Item/Item.vue'
import { storeToRefs } from 'pinia'
import { useQueueStore } from '@/domain/queue/QueueStore'

const queueStore = useQueueStore()
const { items, currentIndex } = storeToRefs(queueStore)
</script>

<template>
  <div class="min-h-0 queue-tab">
    <div class="flex-1 overflow-hidden overflow-y-scroll rounded-t-4xl">
      <div class="flex flex-col gap-2">
        <p v-if="items.length === 0" class="text-sm text-primary/60 text-center py-6">
          No tracks in queue.
        </p>
        <Item
          v-for="(track, index) in items"
          :key="track.id"
          :imageSrc="track.coverUrl"
          :title="track.title"
          :subtitle="track.artist"
          :draggable="true"
          :isFirst="index === 0"
          :class="{ 'opacity-60': index < currentIndex }"
        />
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@use '@/styles/variables/main-vars.scss' as *;

.queue-tab {
  .item:first-of-type {
    border: 1px $primary solid !important;
    backdrop-filter: none !important;
    background-color: $primary !important;

    .title {
      color: $secondary !important;
    }

    .subtitle {
      color: rgba($secondary, 0.6) !important;
    }
  }
}
</style>
