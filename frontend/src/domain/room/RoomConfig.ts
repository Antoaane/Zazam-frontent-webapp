export type RoomConnectionConfig = {
  signalingUrl: string
  rtcConfiguration: RTCConfiguration
}

const buildDefaultSignalingUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_ROOM_SIGNALING_URL?.trim()
  if (configuredUrl) {
    return configuredUrl
  }

  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${protocol}://${window.location.host}/room-signal`
  }

  return 'ws://127.0.0.1:8080'
}

const buildIceServers = (): RTCIceServer[] => {
  const stunUrl = import.meta.env.VITE_ROOM_STUN_URL?.trim() || 'stun:stun.l.google.com:19302'
  const iceServers: RTCIceServer[] = [{ urls: stunUrl }]

  const turnUrl = import.meta.env.VITE_ROOM_TURN_URL?.trim()
  if (turnUrl) {
    iceServers.push({
      urls: turnUrl,
      username: import.meta.env.VITE_ROOM_TURN_USERNAME?.trim(),
      credential: import.meta.env.VITE_ROOM_TURN_CREDENTIAL?.trim(),
    })
  }

  return iceServers
}

export const createRoomConnectionConfig = (
  overrides?: Partial<RoomConnectionConfig>,
): RoomConnectionConfig => {
  return {
    signalingUrl: overrides?.signalingUrl || buildDefaultSignalingUrl(),
    rtcConfiguration: overrides?.rtcConfiguration || {
      iceServers: buildIceServers(),
    },
  }
}
