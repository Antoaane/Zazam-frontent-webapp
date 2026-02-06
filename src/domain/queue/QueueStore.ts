import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { QueueMode, QueueSnapshot, QueueTrack } from './QueueTypes'

const STORAGE_KEY = 'zazam_queue_state'

type PersistedQueueState = {
  mode: QueueMode
  items: QueueTrack[]
  currentIndex: number
  updatedAt: number
  lastPlayedTrackId: string | null
  lastPlayedPositionMs: number
  lastPlayedAt: number
}

const loadPersistedState = (): PersistedQueueState | null => {
  if (typeof window === 'undefined') {
    return null
  }
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return null
  }
  try {
    return JSON.parse(raw) as PersistedQueueState
  } catch (error) {
    console.log('[Queue] Failed to parse persisted state', error)
    return null
  }
}

const persistState = (state: PersistedQueueState) => {
  if (typeof window === 'undefined') {
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export const useQueueStore = defineStore('queue', () => {
  const persisted = loadPersistedState()
  const mode = ref<QueueMode>('host')
  const items = ref<QueueTrack[]>([])
  const currentIndex = ref(0)
  const updatedAt = ref(Date.now())
  const lastPlayedTrackId = ref<string | null>(null)
  const lastPlayedPositionMs = ref(0)
  const lastPlayedAt = ref(Date.now())

  if (persisted) {
    mode.value = persisted.mode ?? 'host'
    items.value = persisted.items ?? []
    currentIndex.value = persisted.currentIndex ?? 0
    updatedAt.value = persisted.updatedAt ?? Date.now()
    lastPlayedTrackId.value = persisted.lastPlayedTrackId ?? null
    lastPlayedPositionMs.value = persisted.lastPlayedPositionMs ?? 0
    lastPlayedAt.value = persisted.lastPlayedAt ?? Date.now()
  }

  const isReadOnly = computed(() => mode.value === 'guest')
  const currentTrack = computed(() => items.value[currentIndex.value] ?? null)
  const upcoming = computed(() => items.value.slice(currentIndex.value + 1))

  const replaceQueue = (tracks: QueueTrack[], index = 0) => {
    if (isReadOnly.value) {
      console.log('[Queue] Replace ignored (read-only)')
      return
    }
    items.value = tracks
    currentIndex.value = Math.max(0, Math.min(index, tracks.length - 1))
    updatedAt.value = Date.now()
    lastPlayedTrackId.value = tracks[currentIndex.value]?.id ?? null
    lastPlayedPositionMs.value = 0
    lastPlayedAt.value = Date.now()
  }

  const appendTracks = (tracks: QueueTrack[]) => {
    if (isReadOnly.value) {
      console.log('[Queue] Append ignored (read-only)')
      return
    }
    if (tracks.length === 0) {
      return
    }
    items.value = [...items.value, ...tracks]
    updatedAt.value = Date.now()
  }

  const advance = () => {
    if (isReadOnly.value) {
      console.log('[Queue] Advance ignored (read-only)')
      return
    }
    if (items.value.length === 0) {
      return
    }

    const nextIndex = currentIndex.value + 1
    if (nextIndex >= items.value.length) {
      items.value = []
      currentIndex.value = 0
      lastPlayedTrackId.value = null
      lastPlayedPositionMs.value = 0
      lastPlayedAt.value = Date.now()
      updatedAt.value = Date.now()
      return
    }

    items.value = items.value.slice(nextIndex)
    currentIndex.value = 0
    updatedAt.value = Date.now()
    lastPlayedTrackId.value = items.value[0]?.id ?? null
    lastPlayedPositionMs.value = 0
    lastPlayedAt.value = Date.now()
  }

  const setCurrentIndex = (index: number) => {
    if (isReadOnly.value) {
      console.log('[Queue] Set current ignored (read-only)')
      return
    }
    currentIndex.value = Math.max(0, Math.min(index, Math.max(items.value.length - 1, 0)))
    updatedAt.value = Date.now()
    lastPlayedTrackId.value = items.value[currentIndex.value]?.id ?? null
    lastPlayedPositionMs.value = 0
    lastPlayedAt.value = Date.now()
  }

  const setMode = (nextMode: QueueMode) => {
    mode.value = nextMode
  }

  const setPlaybackProgress = (trackId: string, positionMs: number) => {
    if (isReadOnly.value) {
      return
    }
    lastPlayedTrackId.value = trackId
    lastPlayedPositionMs.value = positionMs
    lastPlayedAt.value = Date.now()
  }

  const applySnapshot = (snapshot: QueueSnapshot) => {
    mode.value = 'guest'
    items.value = snapshot.items
    currentIndex.value = snapshot.currentIndex
    updatedAt.value = snapshot.updatedAt
    lastPlayedTrackId.value = snapshot.lastPlayedTrackId ?? null
    lastPlayedPositionMs.value = snapshot.lastPlayedPositionMs ?? 0
    lastPlayedAt.value = Date.now()
  }

  watch(
    [mode, items, currentIndex, updatedAt, lastPlayedTrackId, lastPlayedPositionMs, lastPlayedAt],
    () => {
      persistState({
        mode: mode.value,
        items: items.value,
        currentIndex: currentIndex.value,
        updatedAt: updatedAt.value,
        lastPlayedTrackId: lastPlayedTrackId.value,
        lastPlayedPositionMs: lastPlayedPositionMs.value,
        lastPlayedAt: lastPlayedAt.value,
      })
    },
    { deep: true },
  )

  return {
    mode,
    items,
    currentIndex,
    updatedAt,
    lastPlayedTrackId,
    lastPlayedPositionMs,
    lastPlayedAt,
    isReadOnly,
    currentTrack,
    upcoming,
    replaceQueue,
    appendTracks,
    advance,
    setCurrentIndex,
    setMode,
    setPlaybackProgress,
    applySnapshot,
  }
})
