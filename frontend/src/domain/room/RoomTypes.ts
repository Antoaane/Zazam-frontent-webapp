export type RoomRole = 'host' | 'guest'

export type RoomConnectionState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

export type ClientSignalingMessage =
  | { type: 'CREATE_ROOM' }
  | { type: 'JOIN_ROOM'; roomId: string }
  | { type: 'LEAVE_ROOM' }
  | { type: 'SIGNAL'; roomId: string; targetPeerId: string; payload: unknown }

export type ServerSignalingMessage =
  | { type: 'ROOM_CREATED'; roomId: string; peerId: string; role: 'host' }
  | {
      type: 'ROOM_JOINED'
      roomId: string
      peerId: string
      role: 'guest'
      hostId: string
      participants: string[]
    }
  | { type: 'ROOM_LEFT'; roomId: string }
  | { type: 'ROOM_CLOSED'; roomId: string; reason: 'HOST_LEFT' }
  | { type: 'PEER_JOINED'; roomId: string; peerId: string }
  | { type: 'PEER_LEFT'; roomId: string; peerId: string }
  | { type: 'SIGNAL'; roomId: string; fromPeerId: string; payload: unknown }
  | { type: 'ERROR'; code: string; message: string }

export type WebRtcSignalPayload =
  | { kind: 'sdp'; description: RTCSessionDescriptionInit }
  | { kind: 'ice'; candidate: RTCIceCandidateInit }

export type RoomSession = {
  roomId: string
  peerId: string
  role: RoomRole
  hostId: string
}

export type RoomConnectionCallbacks = {
  onPeerConnected?: (peerId: string) => void
  onPeerDisconnected?: (peerId: string) => void
  onDataMessage?: (peerId: string, payload: unknown) => void
  onRoomClosed?: () => void
  onConnectionStateChange?: (state: RoomConnectionState) => void
  onError?: (error: Error) => void
}

export type HelloMessage = {
  type: 'HELLO'
  peerId: string
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

export const isServerSignalingMessage = (value: unknown): value is ServerSignalingMessage => {
  return isRecord(value) && typeof value.type === 'string'
}

export const isWebRtcSignalPayload = (value: unknown): value is WebRtcSignalPayload => {
  if (!isRecord(value) || typeof value.kind !== 'string') {
    return false
  }

  if (value.kind === 'sdp') {
    return isRecord(value.description)
  }

  if (value.kind === 'ice') {
    return isRecord(value.candidate)
  }

  return false
}

export const isHelloMessage = (value: unknown): value is HelloMessage => {
  return isRecord(value) && value.type === 'HELLO' && typeof value.peerId === 'string'
}
