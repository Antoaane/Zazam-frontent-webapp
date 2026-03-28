import { createRoomConnectionConfig } from './RoomConfig'
import { RoomConnectionManager } from './RoomConnectionManager'
import { useRoomStore } from './RoomStore'
import { isHelloMessage } from './RoomTypes'

class RoomFacade {
  private readonly manager = new RoomConnectionManager(createRoomConnectionConfig())

  constructor() {
    this.manager.setCallbacks({
      onConnectionStateChange: (state) => {
        this.getStore().setConnectionState(state)
      },
      onPeerConnected: (peerId) => {
        this.getStore().addPeer(peerId)
      },
      onPeerDisconnected: (peerId) => {
        this.getStore().removePeer(peerId)
      },
      onDataMessage: (peerId, payload) => {
        if (isHelloMessage(payload)) {
          console.log('[Room] HELLO received', {
            fromPeerId: peerId,
            payloadPeerId: payload.peerId,
          })
          return
        }

        console.log('[Room] Data message received', {
          fromPeerId: peerId,
          payload,
        })
      },
      onRoomClosed: () => {
        this.getStore().reset()
      },
      onError: (error) => {
        console.log('[Room] Connection error', error)
        this.getStore().setConnectionState('error')
      },
    })
  }

  private getStore() {
    return useRoomStore()
  }

  async createRoom(): Promise<void> {
    const session = await this.manager.createRoom()
    const store = this.getStore()

    store.setRoom(session.roomId, session.role)
    store.setConnectionState('connected')
    store.setPeers([])
  }

  async joinRoom(roomId: string): Promise<void> {
    const session = await this.manager.joinRoom(roomId)
    const store = this.getStore()

    store.setRoom(session.roomId, session.role)
    store.setConnectionState('connected')
    store.setPeers([])
  }

  leaveRoom(): void {
    this.manager.leaveRoom()
    this.getStore().reset()
  }
}

export const roomFacade = new RoomFacade()
