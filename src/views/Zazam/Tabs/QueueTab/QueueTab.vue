<script lang="ts" setup>
import Item from '@/components/Item/Item.vue'

const queueTracks = [
  {
    coverSrc: '/images/test/album1.jpg',
    title: 'Song Title 1',
    subTitle: 'Artist Name 1',
  },
  {
    coverSrc: '/images/test/album2.jpg',
    title: 'Song Title 2',
    subTitle: 'Artist Name 2',
  },
  {
    coverSrc: '/images/test/album3.jpg',
    title: 'Song Title 3',
    subTitle: 'Artist Name 3',
  },
]
</script>

<template>
  <div class="queue-tab">
    <Item
      v-for="track in queueTracks"
      :imageSrc="track.coverSrc"
      :title="track.title"
      :subtitle="track.subTitle"
      :draggable="true"
    />
  </div>
</template>
