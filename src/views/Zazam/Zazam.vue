<script setup lang="ts">
import PlaylistsTab from '@/views/Zazam/Tabs/PlaylistsTab/PlaylistsTab.vue'
import LikesTab from '@/views/Zazam/Tabs/LikesTab/LikesTab.vue'
import QueueTab from '@/views/Zazam/Tabs/QueueTab/QueueTab.vue'
import SearchTab from '@/views/Zazam/Tabs/SearchTab/SearchTab.vue'
import Header from '@/views/Zazam/Header/Header.vue'
import Player from '@/views/Zazam/Player/Player.vue'
import { Heart, LibraryBig, ListEnd, Search } from 'lucide-vue-next'
import { shallowRef, type Component } from 'vue'

const currentTab = shallowRef<Component>(PlaylistsTab)
</script>

<template>
  <Header />
  <div class="grow shrink flex flex-col rounded-5xl glass">
    <keep-alive>
      <component :is="currentTab" />
    </keep-alive>
    <div class="h-22 rounded-b-5xl border-t border-primary/50">
      <nav class="w-full h-full p-2 flex">
        <button
          :class="{
            'flex-1 h-full flex items-center justify-center rounded-full': true,
            glass: currentTab === QueueTab,
          }"
          @click="currentTab = QueueTab"
        >
          <ListEnd :size="28" />
        </button>
        <button
          :class="{
            'flex-1 h-full flex items-center justify-center rounded-full': true,
            glass: currentTab === LikesTab,
          }"
          @click="currentTab = LikesTab"
        >
          <Heart :size="28" />
        </button>
        <button
          :class="{
            'flex-1 h-full flex items-center justify-center rounded-full': true,
            glass: currentTab === SearchTab,
          }"
          @click="currentTab = SearchTab"
        >
          <Search :size="28" />
        </button>
        <button
          :class="{
            'flex-1 h-full flex items-center justify-center rounded-full': true,
            glass: currentTab === PlaylistsTab,
          }"
          @click="currentTab = PlaylistsTab"
        >
          <LibraryBig :size="28" />
        </button>
      </nav>
    </div>
  </div>

  <div class="shrink">
    <button></button>
    <Player />
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables/main-vars.scss' as *;
button {
  svg {
    stroke: $primary;
  }
}
</style>
