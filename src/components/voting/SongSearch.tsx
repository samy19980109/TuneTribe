'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Track } from '@/lib/types'
import { usePlayerStore } from '@/stores/usePlayerStore'

const supabase = createClient()

interface SongSearchProps {
  eventId: string
  userId: string
  onNominated: () => void
}

export default function SongSearch({ eventId, userId, onNominated }: SongSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Track[]>([])
  const [loading, setLoading] = useState(false)
  const [nominatingId, setNominatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const { playPreview, stopPreview, currentTrack, isPlaying } = usePlayerStore()

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/tracks/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.tracks || [])
      } catch {
        setError('Search failed. Please try again.')
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const handleNominate = async (track: Track) => {
    setNominatingId(track.id)
    setError(null)

    const { error: insertError } = await supabase
      .from('event_song_nominations')
      .insert({
        event_id: eventId,
        nominated_by: userId,
        spotify_track_id: track.externalId,
        title: track.title,
        artist: track.artist,
        album: track.album,
        album_art: track.albumArt,
        duration: track.duration,
        preview_url: track.previewUrl,
      })

    if (insertError) {
      if (insertError.code === '23505') {
        setError('This song has already been nominated.')
      } else {
        setError('Failed to nominate. Please try again.')
        console.error('Nomination error:', insertError)
      }
    } else {
      onNominated()
      setQuery('')
      setResults([])
    }

    setNominatingId(null)
  }

  const handlePreview = (track: Track) => {
    if (currentTrack?.id === track.id && isPlaying) {
      stopPreview()
    } else if (track.previewUrl) {
      playPreview(track.previewUrl)
    }
  }

  return (
    <div>
      {/* Search input */}
      <div className="relative mb-4">
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for a song to nominate..."
          className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/20 transition-colors"
        />
        {loading && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400 mb-3 px-1">{error}</p>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {results.map((track) => (
            <div
              key={track.id}
              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-colors"
            >
              {/* Album art */}
              <img
                src={track.albumArt}
                alt={track.album}
                className="w-11 h-11 rounded-lg object-cover flex-shrink-0"
              />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-100 truncate">{track.title}</p>
                <p className="text-xs text-gray-500 truncate">{track.artist}</p>
              </div>

              {/* Preview */}
              {track.previewUrl && (
                <button
                  onClick={() => handlePreview(track)}
                  className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  {currentTrack?.id === track.id && isPlaying ? (
                    <svg className="w-3.5 h-3.5 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              )}

              {/* Nominate button */}
              <button
                onClick={() => handleNominate(track)}
                disabled={nominatingId === track.id}
                className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#1DB954] text-black hover:bg-[#1ed760] transition-colors disabled:opacity-50"
              >
                {nominatingId === track.id ? '...' : 'Add'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
