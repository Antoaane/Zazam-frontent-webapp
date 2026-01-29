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
  <div
    class="w-full h-full grow shrink rounded-4xl border-2 bg-primary/15 border-primary/25 backdrop-blur-3xl"
  >
    <div>
      <keep-alive>
        <component :is="currentTab" />
      </keep-alive>
    </div>
    <div>
      <nav>
        <button @click="currentTab = QueueTab">
          <ListEnd />
        </button>
        <button @click="currentTab = LikesTab">
          <Heart />
        </button>
        <button @click="currentTab = SearchTab">
          <Search />
        </button>
        <button @click="currentTab = PlaylistsTab">
          <LibraryBig />
        </button>
      </nav>
    </div>
  </div>

  <div class="flex-1 grow shrink">
    <button></button>
    <Player />
  </div>
</template>
