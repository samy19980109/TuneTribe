'use client'

import type { SongNomination } from '@/lib/types'

type PlaybackMode = 'sdk' | 'preview' | 'none'

interface SwipeCardProps {
  nomination: SongNomination
  deltaX: number
  isDragging: boolean
  isTop: boolean
  onPlay: () => void
  onStop: () => void
  isPlaying: boolean
  playbackMode: PlaybackMode
  progress: number
}

const THRESHOLD = 100

export default function SwipeCard({
  nomination,
  deltaX,
  isDragging,
  isTop,
  onPlay,
  onStop,
  isPlaying,
  playbackMode,
  progress,
}: SwipeCardProps) {
  const rotation = isTop ? deltaX * 0.08 : 0
  const likeOpacity = Math.max(0, Math.min(1, deltaX / THRESHOLD))
  const skipOpacity = Math.max(0, Math.min(1, -deltaX / THRESHOLD))

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (playbackMode === 'none') return
    if (isPlaying) {
      onStop()
    } else {
      onPlay()
    }
  }

  return (
    <div
      className="absolute inset-0 rounded-2xl overflow-hidden border border-white/[0.08] bg-gray-900"
      style={{
        transform: isTop
          ? `translateX(${deltaX}px) rotate(${rotation}deg)`
          : 'scale(0.85)',
        transition: isDragging ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
        zIndex: isTop ? 2 : 1,
        opacity: isTop ? 1 : 0,
      }}
    >
      {/* Album art */}
      <div className="relative w-full h-[65%]">
        <img
          src={nomination.album_art}
          alt={nomination.title}
          className="w-full h-full object-cover"
        />

        {/* Swipe indicators */}
        {isTop && (
          <>
            <div
              className="absolute top-6 right-6 px-4 py-2 rounded-xl border-2 border-[#1DB954] text-[#1DB954] font-bold text-lg tracking-wider rotate-[-12deg]"
              style={{ opacity: likeOpacity }}
            >
              LIKE
            </div>
            <div
              className="absolute top-6 left-6 px-4 py-2 rounded-xl border-2 border-red-500 text-red-500 font-bold text-lg tracking-wider rotate-[12deg]"
              style={{ opacity: skipOpacity }}
            >
              SKIP
            </div>
          </>
        )}

        {/* Progress bar */}
        {isTop && playbackMode !== 'none' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
            <div
              className={`h-full transition-[width] duration-300 ease-linear ${
                playbackMode === 'sdk' ? 'bg-[#1DB954]' : 'bg-gray-400'
              }`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}

        {/* Play/pause button */}
        {isTop && (
          <button
            onClick={handlePlayPause}
            disabled={playbackMode === 'none'}
            className={`absolute bottom-4 right-4 w-12 h-12 rounded-full backdrop-blur-md flex items-center justify-center transition-colors ${
              playbackMode === 'none'
                ? 'bg-black/40 cursor-not-allowed'
                : 'bg-black/60 hover:bg-black/80'
            }`}
            title={playbackMode === 'none' ? 'No preview available' : undefined}
          >
            {isPlaying ? (
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className={`w-5 h-5 ml-0.5 ${playbackMode === 'none' ? 'text-gray-500' : 'text-white'}`} fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        )}

        {/* Mode badge */}
        {isTop && playbackMode !== 'none' && isPlaying && (
          <div className="absolute bottom-4 right-18 flex items-center gap-1.5 bg-black/50 backdrop-blur-md rounded-full px-2.5 py-1">
            <div className={`w-1.5 h-1.5 rounded-full ${
              playbackMode === 'sdk' ? 'bg-[#1DB954]' : 'bg-gray-400'
            }`} />
            <span className="text-[10px] font-medium text-white/80">
              {playbackMode === 'sdk' ? 'Premium' : 'Preview'}
            </span>
          </div>
        )}
      </div>

      {/* Song info */}
      <div className="p-5">
        <h3 className="text-lg font-bold text-white truncate mb-1">{nomination.title}</h3>
        <p className="text-sm text-gray-400 truncate">{nomination.artist}</p>
        <p className="text-xs text-gray-600 truncate mt-1">{nomination.album}</p>
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
          {nomination.duration > 0 && (
            <span>{Math.floor(nomination.duration / 60)}:{String(Math.round(nomination.duration % 60)).padStart(2, '0')}</span>
          )}
          {nomination.duration > 0 && nomination.release_year && (
            <span className="text-gray-700">&middot;</span>
          )}
          {nomination.release_year && (
            <span>{nomination.release_year}</span>
          )}
        </div>
      </div>
    </div>
  )
}
