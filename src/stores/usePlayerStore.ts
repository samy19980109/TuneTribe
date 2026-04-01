import { create } from 'zustand'
import type { Track } from '@/lib/types'
import type { SongNomination } from '@/lib/types'
import { getChorusOffsetMs } from '@/lib/chorus-heuristic'
import { startPlayback } from '@/lib/music-api/spotify-playback'
import { getStoredAccessToken } from '@/lib/music-api/spotify-auth'

type PlaybackMode = 'sdk' | 'preview' | 'none'

const SDK_PREVIEW_DURATION_MS = 30_000

interface PlayerState {
  currentTrack: Track | null
  isPlaying: boolean
  progress: number
  duration: number
  volume: number
  previewAudio: HTMLAudioElement | null
  playbackMode: PlaybackMode
  currentTrackId: string | null
  normalizedProgress: number
  autoPauseTimer: ReturnType<typeof setTimeout> | null

  setCurrentTrack: (track: Track | null) => void
  setIsPlaying: (isPlaying: boolean) => void
  setProgress: (progress: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  playPreview: (url: string) => void
  stopPreview: () => void
  togglePlay: () => void
  playTrack: (
    nomination: SongNomination,
    sdkPlayer: Spotify.Player | null,
    deviceId: string | null,
    isPremium: boolean,
    isReady: boolean
  ) => Promise<void>
  stopTrack: (sdkPlayer: Spotify.Player | null) => void
  toggleTrack: (sdkPlayer: Spotify.Player | null) => void
  updateFromSDKState: (state: WebPlaybackState) => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  duration: 30,
  volume: 1,
  previewAudio: null,
  playbackMode: 'none',
  currentTrackId: null,
  normalizedProgress: 0,
  autoPauseTimer: null,

  setCurrentTrack: (track) => set({ currentTrack: track }),

  setIsPlaying: (isPlaying) => set({ isPlaying }),

  setProgress: (progress) => set({ progress }),

  setDuration: (duration) => set({ duration }),

  setVolume: (volume) => set({ volume }),

  playPreview: (url) => {
    const { previewAudio } = get()

    if (previewAudio) {
      previewAudio.pause()
    }

    const audio = new Audio(url)
    audio.volume = get().volume

    audio.addEventListener('timeupdate', () => {
      const dur = audio.duration || 1
      set({
        progress: audio.currentTime,
        normalizedProgress: audio.currentTime / dur,
      })
    })

    audio.addEventListener('loadedmetadata', () => {
      set({ duration: audio.duration })
    })

    audio.addEventListener('ended', () => {
      set({ isPlaying: false, progress: 0, normalizedProgress: 0 })
    })

    audio.play().catch(console.error)
    set({
      previewAudio: audio,
      isPlaying: true,
      playbackMode: 'preview',
      currentTrack: { ...get().currentTrack!, previewUrl: url } as Track,
    })
  },

  stopPreview: () => {
    const { previewAudio } = get()
    if (previewAudio) {
      previewAudio.pause()
      previewAudio.currentTime = 0
    }
    set({ isPlaying: false, progress: 0, normalizedProgress: 0 })
  },

  togglePlay: () => {
    const { previewAudio, isPlaying } = get()
    if (previewAudio) {
      if (isPlaying) {
        previewAudio.pause()
      } else {
        previewAudio.play().catch(console.error)
      }
      set({ isPlaying: !isPlaying })
    }
  },

  playTrack: async (nomination, sdkPlayer, deviceId, isPremium, isReady) => {
    const { previewAudio, autoPauseTimer } = get()

    // Stop any current playback
    if (previewAudio) {
      previewAudio.pause()
      previewAudio.currentTime = 0
    }
    if (autoPauseTimer) {
      clearTimeout(autoPauseTimer)
    }

    set({
      currentTrackId: nomination.spotify_track_id,
      isPlaying: false,
      normalizedProgress: 0,
      progress: 0,
      autoPauseTimer: null,
    })

    // Try SDK path first — only when device is fully ready
    if (isPremium && isReady && sdkPlayer && deviceId) {
      const token = getStoredAccessToken()
      if (token) {
        const durationMs = nomination.duration * 1000
        const offsetMs = getChorusOffsetMs(durationMs)
        const result = await startPlayback(deviceId, nomination.spotify_track_id, offsetMs, token)

        if (result.success) {
          const timer = setTimeout(() => {
            sdkPlayer.pause()
            set({ isPlaying: false, autoPauseTimer: null })
          }, SDK_PREVIEW_DURATION_MS)

          set({ playbackMode: 'sdk', isPlaying: true, autoPauseTimer: timer })
          return
        }
      }
      // SDK failed, fall through to preview_url
    }

    // Try preview_url fallback
    if (nomination.preview_url) {
      get().playPreview(nomination.preview_url)
      set({ playbackMode: 'preview' })
      return
    }

    // No playback available
    set({ playbackMode: 'none', isPlaying: false })
  },

  stopTrack: (sdkPlayer) => {
    const { playbackMode, autoPauseTimer } = get()

    if (autoPauseTimer) {
      clearTimeout(autoPauseTimer)
      set({ autoPauseTimer: null })
    }

    if (playbackMode === 'sdk' && sdkPlayer) {
      sdkPlayer.pause()
      set({ isPlaying: false, normalizedProgress: 0, progress: 0 })
    } else {
      get().stopPreview()
    }
  },

  toggleTrack: (sdkPlayer) => {
    const { playbackMode, isPlaying } = get()

    if (playbackMode === 'sdk' && sdkPlayer) {
      if (isPlaying) {
        sdkPlayer.pause()
      } else {
        sdkPlayer.resume()
      }
      set({ isPlaying: !isPlaying })
    } else {
      get().togglePlay()
    }
  },

  updateFromSDKState: (state) => {
    const dur = state.duration || 1
    set({
      progress: state.position / 1000,
      duration: state.duration / 1000,
      normalizedProgress: state.position / dur,
      isPlaying: !state.paused,
    })
  },
}))
