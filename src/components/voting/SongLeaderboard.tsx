'use client'

import type { SongNomination } from '@/lib/types'

interface SongLeaderboardProps {
  nominations: SongNomination[]
  onPlayPreview: (url: string) => void
}

export default function SongLeaderboard({ nominations, onPlayPreview }: SongLeaderboardProps) {
  const sorted = [...nominations].sort((a, b) => b.vote_count - a.vote_count)

  if (sorted.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm">No nominations yet. Be the first to add a song.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sorted.map((nom, index) => (
        <div
          key={nom.id}
          className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
            index < 3
              ? 'bg-white/[0.04] border border-white/[0.08]'
              : 'hover:bg-white/[0.02]'
          }`}
        >
          {/* Rank */}
          <div className="flex-shrink-0 w-8 text-center">
            {index === 0 ? (
              <span className="text-lg">&#x1f947;</span>
            ) : index === 1 ? (
              <span className="text-lg">&#x1f948;</span>
            ) : index === 2 ? (
              <span className="text-lg">&#x1f949;</span>
            ) : (
              <span className="text-sm text-gray-600 font-medium">{index + 1}</span>
            )}
          </div>

          {/* Album art */}
          <img
            src={nom.album_art}
            alt={nom.title}
            className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
          />

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-100 truncate">{nom.title}</p>
            <p className="text-xs text-gray-500 truncate">{nom.artist}</p>
          </div>

          {/* Preview button */}
          {nom.preview_url && (
            <button
              onClick={() => onPlayPreview(nom.preview_url!)}
              className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          )}

          {/* Vote count */}
          <div className="flex-shrink-0 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <span className="text-sm font-semibold text-gray-300">{nom.vote_count}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
