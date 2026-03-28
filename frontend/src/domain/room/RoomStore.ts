import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { RoomConnectionState, RoomRole } from './RoomTypes'

export const useRoomStore = defineStore('room', () => {
  const roomId = ref<string | null>(null)
  const role = ref<RoomRole | null>(null)
  const connectionState = ref<RoomConnectionState>('idle')
  const peers = ref<string[]>([])

  const setRoom = (nextRoomId: string, nextRole: RoomRole) => {
    roomId.value = nextRoomId
    role.value = nextRole
    peers.value = []
  }

  const setConnectionState = (nextState: RoomConnectionState) => {
    connectionState.value = nextState
  }

  const setPeers = (nextPeers: string[]) => {
    peers.value = [...new Set(nextPeers)]
  }

  const addPeer = (peerId: string) => {
    if (!peers.value.includes(peerId)) {
      peers.value = [...peers.value, peerId]
    }
  }

  const removePeer = (peerId: string) => {
    peers.value = peers.value.filter((currentPeerId) => currentPeerId !== peerId)
  }

  const reset = () => {
    roomId.value = null
    role.value = null
    connectionState.value = 'idle'
    peers.value = []
  }

  return {
    roomId,
    role,
    connectionState,
    peers,
    setRoom,
    setConnectionState,
    setPeers,
    addPeer,
    removePeer,
    reset,
  }
})
