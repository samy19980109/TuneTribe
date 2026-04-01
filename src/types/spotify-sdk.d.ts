interface WebPlaybackError {
  message: string
}

interface WebPlaybackPlayer {
  device_id: string
}

interface WebPlaybackTrack {
  uri: string
  id: string
  name: string
  album: {
    uri: string
    name: string
    images: { url: string }[]
  }
  artists: { uri: string; name: string }[]
}

interface WebPlaybackState {
  position: number
  duration: number
  paused: boolean
  track_window: {
    current_track: WebPlaybackTrack
    previous_tracks: WebPlaybackTrack[]
    next_tracks: WebPlaybackTrack[]
  }
}

declare namespace Spotify {
  class Player {
    constructor(options: {
      name: string
      getOAuthToken: (cb: (token: string) => void) => void
      volume?: number
    })

    connect(): Promise<boolean>
    disconnect(): void
    pause(): Promise<void>
    resume(): Promise<void>
    seek(position_ms: number): Promise<void>
    getVolume(): Promise<number>
    setVolume(volume: number): Promise<void>
    getCurrentState(): Promise<WebPlaybackState | null>

    addListener(event: 'ready', cb: (data: WebPlaybackPlayer) => void): void
    addListener(event: 'not_ready', cb: (data: WebPlaybackPlayer) => void): void
    addListener(event: 'player_state_changed', cb: (state: WebPlaybackState | null) => void): void
    addListener(event: 'initialization_error', cb: (error: WebPlaybackError) => void): void
    addListener(event: 'authentication_error', cb: (error: WebPlaybackError) => void): void
    addListener(event: 'account_error', cb: (error: WebPlaybackError) => void): void
    addListener(event: 'playback_error', cb: (error: WebPlaybackError) => void): void

    removeListener(event: string): void
  }
}

interface Window {
  onSpotifyWebPlaybackSDKReady: (() => void) | undefined
  Spotify: typeof Spotify
}
