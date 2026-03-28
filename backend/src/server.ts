import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { WebSocket, WebSocketServer } from 'ws'
import type { ClientMessage, ServerMessage } from './protocol'
import { isClientMessage } from './protocol'

type PeerId = string

type PeerContext = {
  peerId: PeerId
  roomId: string | null
}

type RoomRecord = {
  roomId: string
  hostId: PeerId
  participants: Map<PeerId, WebSocket>
}

const PORT = Number(process.env.PORT ?? 8080)

const rooms = new Map<string, RoomRecord>()
const contexts = new Map<WebSocket, PeerContext>()

const sendMessage = (socket: WebSocket, message: ServerMessage): void => {
  if (socket.readyState !== WebSocket.OPEN) {
    return
  }
  socket.send(JSON.stringify(message))
}

const sendError = (socket: WebSocket, code: string, message: string): void => {
  sendMessage(socket, { type: 'ERROR', code, message })
}

const buildRoomId = (): string => {
  let roomId = randomUUID().slice(0, 6).toUpperCase()
  while (rooms.has(roomId)) {
    roomId = randomUUID().slice(0, 6).toUpperCase()
  }
  return roomId
}

const resolveContext = (socket: WebSocket): PeerContext | null => {
  const context = contexts.get(socket)
  if (!context) {
    sendError(socket, 'UNREGISTERED_SOCKET', 'Socket context is not initialized')
    return null
  }
  return context
}

const closeRoom = (room: RoomRecord): void => {
  rooms.delete(room.roomId)

  for (const [, participantSocket] of room.participants) {
    const participantContext = contexts.get(participantSocket)
    if (participantContext) {
      participantContext.roomId = null
    }
    sendMessage(participantSocket, {
      type: 'ROOM_CLOSED',
      roomId: room.roomId,
      reason: 'HOST_LEFT',
    })
  }
}

const removeGuestFromRoom = (room: RoomRecord, peerId: PeerId): void => {
  room.participants.delete(peerId)
  const hostSocket = room.participants.get(room.hostId)
  if (!hostSocket) {
    return
  }
  sendMessage(hostSocket, {
    type: 'PEER_LEFT',
    roomId: room.roomId,
    peerId,
  })
}

const leaveRoom = (socket: WebSocket, notifyLeaver: boolean): void => {
  const context = resolveContext(socket)
  if (!context || !context.roomId) {
    return
  }

  const room = rooms.get(context.roomId)
  if (!room) {
    context.roomId = null
    return
  }

  if (room.hostId === context.peerId) {
    closeRoom(room)
    return
  }

  removeGuestFromRoom(room, context.peerId)
  context.roomId = null

  if (notifyLeaver) {
    sendMessage(socket, {
      type: 'ROOM_LEFT',
      roomId: room.roomId,
    })
  }
}

const handleCreateRoom = (socket: WebSocket): void => {
  const context = resolveContext(socket)
  if (!context) {
    return
  }

  if (context.roomId) {
    leaveRoom(socket, false)
  }

  const roomId = buildRoomId()
  const room: RoomRecord = {
    roomId,
    hostId: context.peerId,
    participants: new Map([[context.peerId, socket]]),
  }

  rooms.set(roomId, room)
  context.roomId = roomId

  sendMessage(socket, {
    type: 'ROOM_CREATED',
    roomId,
    peerId: context.peerId,
    role: 'host',
  })
}

const handleJoinRoom = (socket: WebSocket, roomId: string): void => {
  const context = resolveContext(socket)
  if (!context) {
    return
  }

  const normalizedRoomId = roomId.trim().toUpperCase()
  const room = rooms.get(normalizedRoomId)

  if (!room) {
    sendError(socket, 'ROOM_NOT_FOUND', `Room ${normalizedRoomId} not found`)
    return
  }

  if (context.roomId) {
    leaveRoom(socket, false)
  }

  room.participants.set(context.peerId, socket)
  context.roomId = room.roomId

  sendMessage(socket, {
    type: 'ROOM_JOINED',
    roomId: room.roomId,
    peerId: context.peerId,
    role: 'guest',
    hostId: room.hostId,
    participants: [...room.participants.keys()],
  })

  const hostSocket = room.participants.get(room.hostId)
  if (hostSocket && hostSocket !== socket) {
    sendMessage(hostSocket, {
      type: 'PEER_JOINED',
      roomId: room.roomId,
      peerId: context.peerId,
    })
  }
}

const handleSignal = (socket: WebSocket, message: Extract<ClientMessage, { type: 'SIGNAL' }>): void => {
  const context = resolveContext(socket)
  if (!context) {
    return
  }

  if (!context.roomId || context.roomId !== message.roomId) {
    sendError(socket, 'NOT_IN_ROOM', 'You must be in the room to signal')
    return
  }

  const room = rooms.get(message.roomId)
  if (!room) {
    sendError(socket, 'ROOM_NOT_FOUND', `Room ${message.roomId} not found`)
    return
  }

  if (!room.participants.has(message.targetPeerId)) {
    sendError(socket, 'TARGET_NOT_FOUND', `Target peer ${message.targetPeerId} not found`)
    return
  }

  if (message.targetPeerId === context.peerId) {
    sendError(socket, 'INVALID_TARGET', 'Cannot signal yourself')
    return
  }

  const isSenderHost = context.peerId === room.hostId
  const isTargetHost = message.targetPeerId === room.hostId

  if (!isSenderHost && !isTargetHost) {
    sendError(socket, 'STAR_TOPOLOGY_ENFORCED', 'Guests cannot signal other guests directly')
    return
  }

  const targetSocket = room.participants.get(message.targetPeerId)
  if (!targetSocket) {
    sendError(socket, 'TARGET_NOT_FOUND', `Target peer ${message.targetPeerId} not found`)
    return
  }

  sendMessage(targetSocket, {
    type: 'SIGNAL',
    roomId: room.roomId,
    fromPeerId: context.peerId,
    payload: message.payload,
  })
}

const handleClientMessage = (socket: WebSocket, message: ClientMessage): void => {
  switch (message.type) {
    case 'CREATE_ROOM':
      handleCreateRoom(socket)
      break
    case 'JOIN_ROOM':
      handleJoinRoom(socket, message.roomId)
      break
    case 'LEAVE_ROOM':
      leaveRoom(socket, true)
      break
    case 'SIGNAL':
      handleSignal(socket, message)
      break
    default:
      sendError(socket, 'UNKNOWN_MESSAGE', 'Unknown message type')
  }
}

const httpServer = createServer()
const wsServer = new WebSocketServer({ server: httpServer })

wsServer.on('connection', (socket) => {
  const context: PeerContext = {
    peerId: randomUUID(),
    roomId: null,
  }
  contexts.set(socket, context)

  socket.on('message', (rawPayload) => {
    let parsedPayload: unknown

    try {
      const payloadAsString = typeof rawPayload === 'string' ? rawPayload : rawPayload.toString()
      parsedPayload = JSON.parse(payloadAsString)
    } catch {
      sendError(socket, 'INVALID_JSON', 'Payload must be valid JSON')
      return
    }

    if (!isClientMessage(parsedPayload)) {
      sendError(socket, 'INVALID_MESSAGE', 'Invalid client message format')
      return
    }

    handleClientMessage(socket, parsedPayload)
  })

  socket.on('close', () => {
    leaveRoom(socket, false)
    contexts.delete(socket)
  })
})

httpServer.listen(PORT, () => {
  console.log(`[room-signaling] Listening on ws://127.0.0.1:${PORT}`)
})
