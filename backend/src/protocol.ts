export type ClientMessage =
  | { type: 'CREATE_ROOM' }
  | { type: 'JOIN_ROOM'; roomId: string }
  | { type: 'LEAVE_ROOM' }
  | { type: 'SIGNAL'; roomId: string; targetPeerId: string; payload: unknown }

export type ServerMessage =
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

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null
}

const hasString = (value: Record<string, unknown>, key: string): value is Record<string, string> => {
  return typeof value[key] === 'string' && value[key].trim().length > 0
}

export const isClientMessage = (value: unknown): value is ClientMessage => {
  if (!isRecord(value) || typeof value.type !== 'string') {
    return false
  }

  switch (value.type) {
    case 'CREATE_ROOM':
    case 'LEAVE_ROOM':
      return true
    case 'JOIN_ROOM':
      return hasString(value, 'roomId')
    case 'SIGNAL':
      return hasString(value, 'roomId') && hasString(value, 'targetPeerId') && 'payload' in value
    default:
      return false
  }
}
