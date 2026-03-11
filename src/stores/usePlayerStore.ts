import { create } from 'zustand'
import type { Track } from '@/lib/types'

interface PlayerState {
  currentTrack: Track | null
  isPlaying: boolean
  progress: number
  duration: number
  volume: number
  previewAudio: HTMLAudioElement | null
  
  setCurrentTrack: (track: Track | null) => void
  setIsPlaying: (isPlaying: boolean) => void
  setProgress: (progress: number) => void
  setDuration: (duration: number) => void
  setVolume: (volume: number) => void
  playPreview: (url: string) => void
  stopPreview: () => void
  togglePlay: () => void
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  progress: 0,
  duration: 30,
  volume: 1,
  previewAudio: null,

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
      set({ progress: audio.currentTime })
    })
    
    audio.addEventListener('loadedmetadata', () => {
      set({ duration: audio.duration })
    })
    
    audio.addEventListener('ended', () => {
      set({ isPlaying: false, progress: 0 })
    })

    audio.play().catch(console.error)
    set({ previewAudio: audio, isPlaying: true, currentTrack: { ...get().currentTrack!, previewUrl: url } as Track })
  },

  stopPreview: () => {
    const { previewAudio } = get()
    if (previewAudio) {
      previewAudio.pause()
      previewAudio.currentTime = 0
    }
    set({ isPlaying: false, progress: 0 })
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
}))
