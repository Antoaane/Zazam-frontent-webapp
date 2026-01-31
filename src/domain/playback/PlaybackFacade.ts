import type { PlaybackAdapter, PlaybackState, PlaybackStateListener } from './PlaybackAdapter'
import { resolvePlaybackAdapter } from './PlaybackAdapterResolver'

const DEFAULT_STATE: PlaybackState = {
  isReady: false,
  isConnected: false,
  isPlaying: false,
  positionMs: 0,
  durationMs: 0,
  track: null,
  deviceId: null,
}

export class PlaybackFacade {
  private adapter: PlaybackAdapter | null = null
  private state: PlaybackState = { ...DEFAULT_STATE }
  private listeners = new Set<PlaybackStateListener>()
  private unsubscribeAdapter: (() => void) | null = null

  private getAdapter(): PlaybackAdapter {
    if (!this.adapter) {
      this.adapter = resolvePlaybackAdapter()
    }
    return this.adapter
  }

  getState(): PlaybackState {
    return this.state
  }

  onStateChange(listener: PlaybackStateListener): () => void {
    this.listeners.add(listener)
    listener(this.state)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async initialize(): Promise<void> {
    const adapter = this.getAdapter()

    if (!this.unsubscribeAdapter) {
      this.unsubscribeAdapter = adapter.onStateChange((state) => {
        this.state = state
        this.notify()
      })
    }

    this.state = adapter.getState()
    this.notify()

    await adapter.connect()
  }

  async destroy(): Promise<void> {
    if (this.unsubscribeAdapter) {
      this.unsubscribeAdapter()
      this.unsubscribeAdapter = null
    }
    await this.getAdapter().disconnect()
  }

  async play(): Promise<void> {
    await this.getAdapter().play()
  }

  async pause(): Promise<void> {
    await this.getAdapter().pause()
  }

  async togglePlay(): Promise<void> {
    await this.getAdapter().togglePlay()
  }

  async seek(positionMs: number): Promise<void> {
    await this.getAdapter().seek(positionMs)
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state))
  }
}

export const playbackFacade = new PlaybackFacade()
