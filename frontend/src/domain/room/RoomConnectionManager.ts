import type { RoomConnectionConfig } from './RoomConfig'
import type {
  ClientSignalingMessage,
  RoomConnectionCallbacks,
  RoomConnectionState,
  RoomRole,
  RoomSession,
  ServerSignalingMessage,
  WebRtcSignalPayload,
} from './RoomTypes'
import { isServerSignalingMessage, isWebRtcSignalPayload } from './RoomTypes'

type PendingRoomAction = {
  kind: 'create' | 'join'
  resolve: (session: RoomSession) => void
  reject: (error: Error) => void
}

export class RoomConnectionManager {
  private readonly config: RoomConnectionConfig
  private callbacks: RoomConnectionCallbacks = {}

  private socket: WebSocket | null = null
  private openingSocketPromise: Promise<void> | null = null
  private pendingRoomAction: PendingRoomAction | null = null

  private roomId: string | null = null
  private selfPeerId: string | null = null
  private role: RoomRole | null = null
  private hostPeerId: string | null = null

  private peerConnections = new Map<string, RTCPeerConnection>()
  private dataChannels = new Map<string, RTCDataChannel>()
  private connectedPeers = new Set<string>()
  private pendingIceCandidates = new Map<string, RTCIceCandidateInit[]>()

  constructor(config: RoomConnectionConfig, callbacks: RoomConnectionCallbacks = {}) {
    this.config = config
    this.callbacks = callbacks
  }

  setCallbacks(callbacks: RoomConnectionCallbacks): void {
    this.callbacks = callbacks
  }

  async createRoom(): Promise<RoomSession> {
    this.leaveRoom()
    this.updateConnectionState('connecting')
    await this.ensureSocketOpen()

    return this.awaitRoomAction('create', () => {
      this.sendSignalingMessage({ type: 'CREATE_ROOM' })
    })
  }

  async joinRoom(roomId: string): Promise<RoomSession> {
    const normalizedRoomId = roomId.trim().toUpperCase()
    if (!normalizedRoomId) {
      throw new Error('roomId is required')
    }

    this.leaveRoom()
    this.updateConnectionState('connecting')
    await this.ensureSocketOpen()

    return this.awaitRoomAction('join', () => {
      this.sendSignalingMessage({
        type: 'JOIN_ROOM',
        roomId: normalizedRoomId,
      })
    })
  }

  leaveRoom(): void {
    this.rejectPendingRoomAction(new Error('Room action canceled'))

    if (this.roomId && this.socket?.readyState === WebSocket.OPEN) {
      try {
        this.sendSignalingMessage({ type: 'LEAVE_ROOM' })
      } catch (error) {
        this.emitError(error instanceof Error ? error : new Error('Failed to leave room'))
      }
    }

    this.cleanupRoomState()
    this.updateConnectionState('idle')
  }

  private async ensureSocketOpen(): Promise<void> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return
    }

    if (this.openingSocketPromise) {
      return this.openingSocketPromise
    }

    this.openingSocketPromise = new Promise((resolve, reject) => {
      const socket = new WebSocket(this.config.signalingUrl)
      this.socket = socket

      const onOpen = () => {
        cleanupOpenHandlers()
        this.openingSocketPromise = null
        resolve()
      }

      const onOpenError = () => {
        cleanupOpenHandlers()
        this.openingSocketPromise = null
        this.socket = null
        reject(new Error('Failed to connect to signaling server'))
      }

      const cleanupOpenHandlers = () => {
        socket.removeEventListener('open', onOpen)
        socket.removeEventListener('error', onOpenError)
      }

      socket.addEventListener('open', onOpen)
      socket.addEventListener('error', onOpenError)

      socket.addEventListener('message', (event) => {
        this.handleSocketMessage(event.data)
      })

      socket.addEventListener('close', () => {
        this.handleSocketClosed()
      })

      socket.addEventListener('error', () => {
        this.emitError(new Error('Signaling socket error'))
      })
    })

    try {
      await this.openingSocketPromise
    } catch (error) {
      this.updateConnectionState('error')
      throw error instanceof Error ? error : new Error('Failed to open signaling socket')
    }
  }

  private awaitRoomAction(kind: PendingRoomAction['kind'], sendAction: () => void): Promise<RoomSession> {
    this.rejectPendingRoomAction(new Error('Canceled by a new room action'))

    return new Promise((resolve, reject) => {
      this.pendingRoomAction = { kind, resolve, reject }

      try {
        sendAction()
      } catch (error) {
        const normalizedError = error instanceof Error ? error : new Error('Room action failed')
        this.pendingRoomAction = null
        reject(normalizedError)
      }
    })
  }

  private rejectPendingRoomAction(error: Error): void {
    if (!this.pendingRoomAction) {
      return
    }

    this.pendingRoomAction.reject(error)
    this.pendingRoomAction = null
  }

  private resolvePendingRoomAction(session: RoomSession): void {
    if (!this.pendingRoomAction) {
      return
    }

    this.pendingRoomAction.resolve(session)
    this.pendingRoomAction = null
  }

  private sendSignalingMessage(message: ClientSignalingMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error('Signaling socket is not connected')
    }

    this.socket.send(JSON.stringify(message))
  }

  private handleSocketMessage(rawPayload: unknown): void {
    if (typeof rawPayload !== 'string') {
      return
    }

    let parsedPayload: unknown

    try {
      parsedPayload = JSON.parse(rawPayload)
    } catch {
      this.emitError(new Error('Invalid JSON message received from signaling server'))
      return
    }

    if (!isServerSignalingMessage(parsedPayload)) {
      this.emitError(new Error('Unrecognized signaling message received'))
      return
    }

    this.handleServerMessage(parsedPayload)
  }

  private handleServerMessage(message: ServerSignalingMessage): void {
    switch (message.type) {
      case 'ROOM_CREATED': {
        this.roomId = message.roomId
        this.selfPeerId = message.peerId
        this.role = 'host'
        this.hostPeerId = message.peerId
        this.updateConnectionState('connected')

        this.resolvePendingRoomAction({
          roomId: message.roomId,
          peerId: message.peerId,
          role: 'host',
          hostId: message.peerId,
        })
        break
      }

      case 'ROOM_JOINED': {
        this.roomId = message.roomId
        this.selfPeerId = message.peerId
        this.role = 'guest'
        this.hostPeerId = message.hostId
        this.updateConnectionState('connected')

        this.resolvePendingRoomAction({
          roomId: message.roomId,
          peerId: message.peerId,
          role: 'guest',
          hostId: message.hostId,
        })
        break
      }

      case 'PEER_JOINED': {
        if (this.role === 'host' && message.roomId === this.roomId) {
          void this.handleGuestJoined(message.peerId).catch((error) => {
            this.emitError(error instanceof Error ? error : new Error('Failed to handle new guest'))
          })
        }
        break
      }

      case 'PEER_LEFT': {
        if (message.roomId === this.roomId) {
          this.disposePeer(message.peerId)
        }
        break
      }

      case 'SIGNAL': {
        void this.handleSignalingPayload(message).catch((error) => {
          this.emitError(
            error instanceof Error ? error : new Error('Failed to process signaling payload'),
          )
        })
        break
      }

      case 'ROOM_CLOSED': {
        if (message.roomId !== this.roomId) {
          return
        }

        this.cleanupRoomState()
        this.updateConnectionState('disconnected')
        this.callbacks.onRoomClosed?.()
        break
      }

      case 'ROOM_LEFT': {
        if (message.roomId === this.roomId) {
          this.cleanupRoomState()
          this.updateConnectionState('idle')
        }
        break
      }

      case 'ERROR': {
        const error = new Error(`[${message.code}] ${message.message}`)
        this.rejectPendingRoomAction(error)
        this.updateConnectionState('error')
        this.emitError(error)
        break
      }

      default:
        break
    }
  }

  private async handleGuestJoined(peerId: string): Promise<void> {
    this.disposePeer(peerId)

    const peerConnection = this.createPeerConnection(peerId)
    this.peerConnections.set(peerId, peerConnection)

    const dataChannel = peerConnection.createDataChannel('room-data')
    this.attachDataChannel(peerId, dataChannel)

    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    this.sendSignal(peerId, {
      kind: 'sdp',
      description: peerConnection.localDescription || offer,
    })
  }

  private async handleSignalingPayload(message: Extract<ServerSignalingMessage, { type: 'SIGNAL' }>): Promise<void> {
    if (message.roomId !== this.roomId || !isWebRtcSignalPayload(message.payload)) {
      return
    }

    if (this.role === 'host') {
      await this.handleSignalAsHost(message.fromPeerId, message.payload)
      return
    }

    if (this.role === 'guest') {
      await this.handleSignalAsGuest(message.fromPeerId, message.payload)
    }
  }

  private async handleSignalAsHost(
    peerId: string,
    payload: WebRtcSignalPayload,
  ): Promise<void> {
    const peerConnection = this.peerConnections.get(peerId)
    if (!peerConnection) {
      return
    }

    if (payload.kind === 'sdp') {
      if (payload.description.type !== 'answer') {
        return
      }

      await peerConnection.setRemoteDescription(payload.description)
      await this.flushPendingIceCandidates(peerId, peerConnection)
      return
    }

    if (payload.kind === 'ice') {
      if (!peerConnection.remoteDescription) {
        this.queueIceCandidate(peerId, payload.candidate)
        return
      }

      await peerConnection.addIceCandidate(payload.candidate)
    }
  }

  private async handleSignalAsGuest(
    senderPeerId: string,
    payload: WebRtcSignalPayload,
  ): Promise<void> {
    if (!this.hostPeerId || senderPeerId !== this.hostPeerId) {
      return
    }

    const peerConnection = this.getOrCreateGuestPeerConnection(this.hostPeerId)

    if (payload.kind === 'sdp') {
      if (payload.description.type !== 'offer') {
        return
      }

      await peerConnection.setRemoteDescription(payload.description)
      await this.flushPendingIceCandidates(this.hostPeerId, peerConnection)
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)

      this.sendSignal(this.hostPeerId, {
        kind: 'sdp',
        description: peerConnection.localDescription || answer,
      })
      return
    }

    if (payload.kind === 'ice') {
      if (!peerConnection.remoteDescription) {
        this.queueIceCandidate(this.hostPeerId, payload.candidate)
        return
      }

      await peerConnection.addIceCandidate(payload.candidate)
    }
  }

  private getOrCreateGuestPeerConnection(hostPeerId: string): RTCPeerConnection {
    const existing = this.peerConnections.get(hostPeerId)
    if (existing) {
      return existing
    }

    const peerConnection = this.createPeerConnection(hostPeerId)
    peerConnection.ondatachannel = (event) => {
      this.attachDataChannel(hostPeerId, event.channel)
    }

    this.peerConnections.set(hostPeerId, peerConnection)
    return peerConnection
  }

  private createPeerConnection(peerId: string): RTCPeerConnection {
    const peerConnection = new RTCPeerConnection(this.config.rtcConfiguration)

    peerConnection.onicecandidate = (event) => {
      if (!event.candidate) {
        return
      }

      this.sendSignal(peerId, {
        kind: 'ice',
        candidate: event.candidate.toJSON(),
      })
    }

    peerConnection.onconnectionstatechange = () => {
      const state = peerConnection.connectionState
      if (state === 'failed' || state === 'closed' || state === 'disconnected') {
        this.disposePeer(peerId)
      }
    }

    return peerConnection
  }

  private sendSignal(targetPeerId: string, payload: WebRtcSignalPayload): void {
    if (!this.roomId || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return
    }

    this.socket.send(
      JSON.stringify({
        type: 'SIGNAL',
        roomId: this.roomId,
        targetPeerId,
        payload,
      } satisfies ClientSignalingMessage),
    )
  }

  private attachDataChannel(peerId: string, channel: RTCDataChannel): void {
    const existingChannel = this.dataChannels.get(peerId)
    if (existingChannel && existingChannel !== channel) {
      this.disposeDataChannel(peerId, existingChannel)
    }

    this.dataChannels.set(peerId, channel)

    channel.onopen = () => {
      this.markPeerConnected(peerId)

      if (this.selfPeerId) {
        channel.send(
          JSON.stringify({
            type: 'HELLO',
            peerId: this.selfPeerId,
          }),
        )
      }
    }

    channel.onmessage = (event) => {
      this.handleDataChannelMessage(peerId, event.data)
    }

    channel.onclose = () => {
      if (this.dataChannels.get(peerId) === channel) {
        this.dataChannels.delete(peerId)
      }
      this.markPeerDisconnected(peerId)
    }

    channel.onerror = () => {
      this.emitError(new Error(`DataChannel error with peer ${peerId}`))
    }
  }

  private handleDataChannelMessage(peerId: string, rawPayload: unknown): void {
    if (typeof rawPayload !== 'string') {
      return
    }

    let parsedPayload: unknown

    try {
      parsedPayload = JSON.parse(rawPayload)
    } catch {
      parsedPayload = rawPayload
    }

    this.callbacks.onDataMessage?.(peerId, parsedPayload)
  }

  private markPeerConnected(peerId: string): void {
    if (this.connectedPeers.has(peerId)) {
      return
    }

    this.connectedPeers.add(peerId)
    this.callbacks.onPeerConnected?.(peerId)
  }

  private markPeerDisconnected(peerId: string): void {
    if (!this.connectedPeers.has(peerId)) {
      return
    }

    this.connectedPeers.delete(peerId)
    this.callbacks.onPeerDisconnected?.(peerId)
  }

  private disposePeer(peerId: string): void {
    const dataChannel = this.dataChannels.get(peerId)
    if (dataChannel) {
      this.disposeDataChannel(peerId, dataChannel)
      this.dataChannels.delete(peerId)
    }

    const peerConnection = this.peerConnections.get(peerId)
    if (peerConnection) {
      peerConnection.onicecandidate = null
      peerConnection.onconnectionstatechange = null
      peerConnection.ondatachannel = null
      peerConnection.close()
      this.peerConnections.delete(peerId)
    }

    this.pendingIceCandidates.delete(peerId)
    this.markPeerDisconnected(peerId)
  }

  private queueIceCandidate(peerId: string, candidate: RTCIceCandidateInit): void {
    const queue = this.pendingIceCandidates.get(peerId) ?? []
    queue.push(candidate)
    this.pendingIceCandidates.set(peerId, queue)
  }

  private async flushPendingIceCandidates(
    peerId: string,
    peerConnection: RTCPeerConnection,
  ): Promise<void> {
    const queue = this.pendingIceCandidates.get(peerId)
    if (!queue || queue.length === 0) {
      return
    }

    this.pendingIceCandidates.delete(peerId)

    for (const candidate of queue) {
      await peerConnection.addIceCandidate(candidate)
    }
  }

  private disposeDataChannel(peerId: string, channel: RTCDataChannel): void {
    channel.onopen = null
    channel.onmessage = null
    channel.onclose = null
    channel.onerror = null

    if (channel.readyState === 'open' || channel.readyState === 'connecting') {
      channel.close()
    }

    this.markPeerDisconnected(peerId)
  }

  private cleanupRoomState(): void {
    const peerIds = new Set<string>([
      ...this.peerConnections.keys(),
      ...this.dataChannels.keys(),
      ...this.connectedPeers,
      ...this.pendingIceCandidates.keys(),
    ])

    for (const peerId of peerIds) {
      this.disposePeer(peerId)
    }

    this.roomId = null
    this.role = null
    this.hostPeerId = null
    this.connectedPeers.clear()
    this.pendingIceCandidates.clear()
  }

  private handleSocketClosed(): void {
    const hadRoom = Boolean(this.roomId)

    this.rejectPendingRoomAction(new Error('Signaling socket closed'))
    this.cleanupRoomState()

    this.socket = null
    this.selfPeerId = null
    this.openingSocketPromise = null

    if (hadRoom) {
      this.updateConnectionState('disconnected')
      this.callbacks.onRoomClosed?.()
      return
    }

    this.updateConnectionState('idle')
  }

  private updateConnectionState(state: RoomConnectionState): void {
    this.callbacks.onConnectionStateChange?.(state)
  }

  private emitError(error: Error): void {
    this.callbacks.onError?.(error)
  }
}
