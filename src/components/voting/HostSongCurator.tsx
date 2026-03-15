'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Track, Genre, SongNomination } from '@/lib/types'
import { usePlayerStore } from '@/stores/usePlayerStore'

const supabase = createClient()

interface HostSongCuratorProps {
  eventId: string
  userId: string
}

type SortOption = 'relevance' | 'popularity_desc' | 'popularity_asc'

const ERA_PRESETS = [
  { label: '60s', from: '1960', to: '1969' },
  { label: '70s', from: '1970', to: '1979' },
  { label: '80s', from: '1980', to: '1989' },
  { label: '90s', from: '1990', to: '1999' },
  { label: '2000s', from: '2000', to: '2009' },
  { label: '2010s', from: '2010', to: '2019' },
  { label: '2020s', from: '2020', to: '2029' },
]

export default function HostSongCurator({ eventId, userId }: HostSongCuratorProps) {
  // Search & filter state
  const [query, setQuery] = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [artistFilter, setArtistFilter] = useState('')
  const [albumFilter, setAlbumFilter] = useState('')
  const [yearFrom, setYearFrom] = useState('')
  const [yearTo, setYearTo] = useState('')
  const [tag, setTag] = useState('')
  const [sort, setSort] = useState<SortOption>('relevance')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Results & pool
  const [results, setResults] = useState<Track[]>([])
  const [curatedSongs, setCuratedSongs] = useState<SongNomination[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [loading, setLoading] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const { playPreview, stopPreview, currentTrack, isPlaying } = usePlayerStore()

  // Load genres for filter dropdown
  useEffect(() => {
    supabase.from('genres').select('*').order('name').then(({ data }) => {
      setGenres(data || [])
    })
  }, [])

  // Load existing curated songs
  useEffect(() => {
    const fetchCurated = async () => {
      const { data } = await supabase
        .from('event_song_nominations')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      setCuratedSongs(data || [])
    }
    fetchCurated()
  }, [eventId])

  // Build active filter count
  const activeFilterCount = [genreFilter, artistFilter, albumFilter, yearFrom || yearTo, tag].filter(Boolean).length

  // Search with filters
  const doSearch = () => {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (genreFilter) params.set('genre', genreFilter)
    if (artistFilter.trim()) params.set('artist', artistFilter.trim())
    if (albumFilter.trim()) params.set('album', albumFilter.trim())
    if (yearFrom) params.set('yearFrom', yearFrom)
    if (yearTo) params.set('yearTo', yearTo)
    if (tag) params.set('tag', tag)
    if (sort !== 'relevance') params.set('sort', sort)

    if (params.toString() === '') return

    setLoading(true)
    setError(null)

    fetch(`/api/tracks/search?${params.toString()}`)
      .then(res => res.json())
      .then(data => setResults(data.tracks || []))
      .catch(() => setError('Search failed. Please try again.'))
      .finally(() => setLoading(false))
  }

  // Debounced search on query/filter changes
  useEffect(() => {
    const hasInput = query.trim() || genreFilter || artistFilter.trim() || albumFilter.trim() || yearFrom || yearTo || tag
    if (!hasInput) {
      setResults([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(doSearch, 400)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, genreFilter, artistFilter, albumFilter, yearFrom, yearTo, tag, sort])

  const handleAdd = async (track: Track) => {
    setAddingId(track.id)
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
        setError('This song is already in the pool.')
      } else {
        setError('Failed to add song.')
        console.error('Add error:', insertError)
      }
    } else {
      // Refresh curated list
      const { data } = await supabase
        .from('event_song_nominations')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
      setCuratedSongs(data || [])
    }

    setAddingId(null)
  }

  const handleRemove = async (nominationId: string) => {
    await supabase
      .from('event_song_nominations')
      .delete()
      .eq('id', nominationId)

    setCuratedSongs(prev => prev.filter(s => s.id !== nominationId))
  }

  const handlePreview = (track: Track) => {
    if (currentTrack?.id === track.id && isPlaying) {
      stopPreview()
    } else if (track.previewUrl) {
      playPreview(track.previewUrl)
    }
  }

  const clearFilters = () => {
    setGenreFilter('')
    setArtistFilter('')
    setAlbumFilter('')
    setYearFrom('')
    setYearTo('')
    setTag('')
    setSort('relevance')
  }

  const setEraPreset = (from: string, to: string) => {
    setYearFrom(from)
    setYearTo(to)
  }

  const isInPool = (trackId: string) => curatedSongs.some(s => s.spotify_track_id === trackId)

  return (
    <div className="space-y-6">
      {/* Search + Filter header */}
      <div>
        {/* Search input */}
        <div className="relative mb-3">
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
            placeholder="Search songs, artists, albums..."
            className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/20 transition-colors"
          />
          {loading && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-gray-300 rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-[#1DB954] text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
          <svg className={`w-3 h-3 text-gray-500 transition-transform ${filtersOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Filters panel */}
      {filtersOpen && (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Genre */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Genre</label>
              <select
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20 appearance-none"
              >
                <option value="" className="bg-gray-900">Any genre</option>
                {genres.map((g) => (
                  <option key={g.id} value={g.slug} className="bg-gray-900">{g.name}</option>
                ))}
              </select>
            </div>

            {/* Artist */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Artist</label>
              <input
                type="text"
                value={artistFilter}
                onChange={(e) => setArtistFilter(e.target.value)}
                placeholder="e.g. Beatles"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/20"
              />
            </div>

            {/* Album */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Album</label>
              <input
                type="text"
                value={albumFilter}
                onChange={(e) => setAlbumFilter(e.target.value)}
                placeholder="e.g. Abbey Road"
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/20"
              />
            </div>

            {/* Sort */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Sort by</label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortOption)}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/20 appearance-none"
              >
                <option value="relevance" className="bg-gray-900">Relevance</option>
                <option value="popularity_desc" className="bg-gray-900">Most popular</option>
                <option value="popularity_asc" className="bg-gray-900">Underground</option>
              </select>
            </div>
          </div>

          {/* Era presets */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Era</label>
            <div className="flex flex-wrap gap-1.5">
              {ERA_PRESETS.map((era) => (
                <button
                  key={era.label}
                  onClick={() => setEraPreset(era.from, era.to)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    yearFrom === era.from && yearTo === era.to
                      ? 'bg-[#1DB954] text-black'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {era.label}
                </button>
              ))}
              {(yearFrom || yearTo) && (
                <button
                  onClick={() => { setYearFrom(''); setYearTo('') }}
                  className="px-3 py-1 rounded-full text-xs text-gray-500 hover:text-white transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            {/* Custom year range */}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="number"
                value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                placeholder="From"
                min="1900"
                max="2030"
                className="w-20 bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white/20"
              />
              <span className="text-gray-600 text-xs">to</span>
              <input
                type="number"
                value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                placeholder="To"
                min="1900"
                max="2030"
                className="w-20 bg-white/[0.03] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white/20"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Tags</label>
            <div className="flex gap-1.5">
              {['new', 'hipster'].map((t) => (
                <button
                  key={t}
                  onClick={() => setTag(tag === t ? '' : t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    tag === t
                      ? 'bg-[#1DB954] text-black'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {t === 'new' ? 'Recently released' : 'Underground'}
                </button>
              ))}
            </div>
          </div>

          {/* Clear all */}
          {activeFilterCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 hover:text-white transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="text-sm text-red-400 px-1">{error}</p>
      )}

      {/* Search results */}
      {results.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">{results.length} results</p>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {results.map((track) => (
              <div
                key={track.id}
                className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                  isInPool(track.externalId) ? 'opacity-50' : 'hover:bg-white/[0.03]'
                }`}
              >
                {/* Album art */}
                <img
                  src={track.albumArt}
                  alt={track.album}
                  className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-100 truncate">{track.title}</p>
                  <p className="text-xs text-gray-500 truncate">{track.artist}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-600 truncate">{track.album}</span>
                    {track.releaseDate && (
                      <>
                        <span className="text-gray-700">&middot;</span>
                        <span className="text-[10px] text-gray-600">{track.releaseDate.slice(0, 4)}</span>
                      </>
                    )}
                    {track.popularity !== undefined && (
                      <>
                        <span className="text-gray-700">&middot;</span>
                        <div className="flex items-center gap-1">
                          <div className="w-12 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#1DB954] rounded-full"
                              style={{ width: `${track.popularity}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-600">{track.popularity}</span>
                        </div>
                      </>
                    )}
                  </div>
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

                {/* Add button */}
                <button
                  onClick={() => handleAdd(track)}
                  disabled={addingId === track.id || isInPool(track.externalId)}
                  className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full bg-[#1DB954] text-black hover:bg-[#1ed760] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isInPool(track.externalId) ? 'Added' : addingId === track.id ? '...' : 'Add'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Curated pool */}
      {curatedSongs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-300">
              Song Pool ({curatedSongs.length})
            </h3>
          </div>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {curatedSongs.map((nom) => (
              <div
                key={nom.id}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/[0.02] transition-colors group"
              >
                <img
                  src={nom.album_art}
                  alt={nom.title}
                  className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 truncate">{nom.title}</p>
                  <p className="text-xs text-gray-500 truncate">{nom.artist}</p>
                </div>
                <button
                  onClick={() => handleRemove(nom.id)}
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all"
                >
                  <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
