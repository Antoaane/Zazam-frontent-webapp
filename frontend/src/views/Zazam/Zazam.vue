<script setup lang="ts">
import PlaylistsTab from '@/views/Zazam/Tabs/PlaylistsTab/PlaylistsTab.vue'
import LikesTab from '@/views/Zazam/Tabs/LikesTab/LikesTab.vue'
import QueueTab from '@/views/Zazam/Tabs/QueueTab/QueueTab.vue'
import SearchTab from '@/views/Zazam/Tabs/SearchTab/SearchTab.vue'
import Header from '@/views/Zazam/Header/Header.vue'
import Player from '@/views/Zazam/Player/Player.vue'
import { Heart, LibraryBig, ListEnd, Search, UserRoundPlus } from 'lucide-vue-next'
import { computed, onMounted, shallowRef, type Component } from 'vue'
import { queueFacade } from '@/domain/queue/QueueFacade'
import { roomFacade } from '@/domain/room/RoomFacade'
import { useRoomStore } from '@/domain/room/RoomStore'

const currentTab = shallowRef<Component>(PlaylistsTab)
const roomStore = useRoomStore()
const isRoomActionBusy = computed(() => roomStore.connectionState === 'connecting')

const roomButtonTitle = computed(() => {
  if (roomStore.roomId && roomStore.role) {
    return `Room ${roomStore.roomId} (${roomStore.role}) - cliquer pour quitter`
  }

  return 'Créer ou rejoindre une room'
})

const handleRoomAction = async () => {
  if (isRoomActionBusy.value) {
    return
  }

  if (roomStore.roomId) {
    const shouldLeave = window.confirm(`Quitter la room ${roomStore.roomId} ?`)
    if (shouldLeave) {
      roomFacade.leaveRoom()
    }
    return
  }

  const shouldCreateRoom = window.confirm(
    'OK: créer une room\nAnnuler: rejoindre une room existante',
  )

  if (shouldCreateRoom) {
    try {
      await roomFacade.createRoom()
    } catch (error) {
      console.log('[Room] Create room failed', error)
    }
    return
  }

  const roomId = window.prompt('Entrez un roomId')
  if (!roomId) {
    return
  }

  try {
    await roomFacade.joinRoom(roomId)
  } catch (error) {
    console.log('[Room] Join room failed', error)
  }
}

onMounted(() => {
  queueFacade.initialize()
})
</script>

<template>
  <Header />
  <div class="min-h-0 grow shrink flex flex-col rounded-5xl glass">
    <keep-alive>
      <component :is="currentTab" />
    </keep-alive>
    <div class="h-22 rounded-b-5xl border-t border-primary/50">
      <nav class="w-full h-full p-2 flex">
        <button
          :class="{
            'nav-item flex-1 h-full flex items-center justify-center rounded-full': true,
            glass: currentTab === QueueTab,
          }"
          @click="currentTab = QueueTab"
        >
          <ListEnd :size="28" />
        </button>
        <button
          :class="{
            'nav-item flex-1 h-full flex items-center justify-center rounded-full': true,
            glass: currentTab === LikesTab,
          }"
          @click="currentTab = LikesTab"
        >
          <Heart :size="28" />
        </button>
        <button
          :class="{
            'nav-item flex-1 h-full flex items-center justify-center rounded-full': true,
            glass: currentTab === SearchTab,
          }"
          @click="currentTab = SearchTab"
        >
          <Search :size="28" />
        </button>
        <button
          :class="{
            'nav-item flex-1 h-full flex items-center justify-center rounded-full': true,
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
    <div class="h-20 flex gap-3">
      <button
        class="add-user h-full aspect-square flex items-center justify-center bg-primary rounded-full"
        type="button"
        :disabled="isRoomActionBusy"
        :title="roomButtonTitle"
        @click="handleRoomAction"
      >
        <UserRoundPlus :size="28" />
      </button>
      <Player />
    </div>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/variables/main-vars.scss' as *;
.nav-item {
  svg {
    stroke: $primary;
  }
}

.add-user {
  svg {
    stroke: $secondary;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
