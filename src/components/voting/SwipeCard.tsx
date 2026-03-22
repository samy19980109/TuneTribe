'use client'

import type { SongNomination } from '@/lib/types'

interface SwipeCardProps {
  nomination: SongNomination
  deltaX: number
  isDragging: boolean
  isTop: boolean
  onPlayPreview: () => void
}

const THRESHOLD = 100

export default function SwipeCard({ nomination, deltaX, isDragging, isTop, onPlayPreview }: SwipeCardProps) {
  const rotation = isTop ? deltaX * 0.08 : 0
  const likeOpacity = Math.max(0, Math.min(1, deltaX / THRESHOLD))
  const skipOpacity = Math.max(0, Math.min(1, -deltaX / THRESHOLD))

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

        {/* Preview button */}
        {nomination.preview_url && isTop && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPlayPreview()
            }}
            className="absolute bottom-4 right-4 w-12 h-12 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center hover:bg-black/80 transition-colors"
          >
            <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
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
            <span className="text-gray-700">·</span>
          )}
          {nomination.release_year && (
            <span>{nomination.release_year}</span>
          )}
        </div>
      </div>
    </div>
  )
}
