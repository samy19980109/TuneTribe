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

const POPULAR_GENRES = [
  'pop', 'rock', 'hip-hop', 'r&b', 'electronic', 'jazz', 'classical',
  'country', 'folk', 'metal', 'indie', 'latin', 'reggae', 'blues',
  'soul', 'punk', 'k-pop', 'afrobeats',
]

export default function HostSongCurator({ eventId, userId }: HostSongCuratorProps) {
  // Multi-select filter state
  const [query, setQuery] = useState('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [artistFilter, setArtistFilter] = useState('')
  const [albumFilter, setAlbumFilter] = useState('')
  const [selectedEras, setSelectedEras] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [sort, setSort] = useState<SortOption>('relevance')
  const [resultLimit, setResultLimit] = useState<number>(20)
  const [showAllGenres, setShowAllGenres] = useState(false)

  // Results, selection, pool
  const [results, setResults] = useState<Track[]>([])
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set())
  const [curatedSongs, setCuratedSongs] = useState<SongNomination[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const { playPreview, stopPreview, currentTrack, isPlaying } = usePlayerStore()

  // Load genres
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

  // Compute year range from selected eras
  const getYearRange = (): { from: string; to: string } | null => {
    if (selectedEras.length === 0) return null
    const eras = ERA_PRESETS.filter(e => selectedEras.includes(e.label))
    if (eras.length === 0) return null
    const from = Math.min(...eras.map(e => parseInt(e.from))).toString()
    const to = Math.max(...eras.map(e => parseInt(e.to))).toString()
    return { from, to }
  }

  // Active filter count
  const activeFilterCount = [
    selectedGenres.length > 0,
    artistFilter.trim(),
    albumFilter.trim(),
    selectedEras.length > 0,
    selectedTags.length > 0,
  ].filter(Boolean).length

  // Search
  const doSearch = () => {
    const params = new URLSearchParams()
    if (query.trim()) params.set('q', query.trim())
    if (selectedGenres.length > 0) params.set('genre', selectedGenres.join(','))
    if (artistFilter.trim()) params.set('artist', artistFilter.trim())
    if (albumFilter.trim()) params.set('album', albumFilter.trim())
    const yearRange = getYearRange()
    if (yearRange) {
      params.set('yearFrom', yearRange.from)
      params.set('yearTo', yearRange.to)
    }
    if (selectedTags.length > 0) params.set('tag', selectedTags.join(','))
    if (sort !== 'relevance') params.set('sort', sort)
    params.set('limit', resultLimit.toString())

    if (!query.trim() && selectedGenres.length === 0 && !artistFilter.trim() && !albumFilter.trim() && selectedEras.length === 0 && selectedTags.length === 0) {
      setResults([])
      return
    }

    setLoading(true)
    setError(null)

    fetch(`/api/tracks/search?${params.toString()}`)
      .then(async res => {
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || `Search failed (${res.status})`)
          setResults([])
        } else {
          setResults(data.tracks || [])
          setSelectedTrackIds(new Set())
        }
      })
      .catch(() => setError('Search failed. Please try again.'))
      .finally(() => setLoading(false))
  }

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(doSearch, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectedGenres, artistFilter, albumFilter, selectedEras, selectedTags, sort, resultLimit])

  // Toggle helpers
  const toggleGenre = (slug: string) => {
    setSelectedGenres(prev =>
      prev.includes(slug) ? prev.filter(g => g !== slug) : [...prev, slug]
    )
  }

  const toggleEra = (label: string) => {
    setSelectedEras(prev =>
      prev.includes(label) ? prev.filter(e => e !== label) : [...prev, label]
    )
  }

  const toggleTag = (t: string) => {
    setSelectedTags(prev =>
      prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]
    )
  }

  const toggleTrackSelection = (trackId: string) => {
    setSelectedTrackIds(prev => {
      const next = new Set(prev)
      if (next.has(trackId)) next.delete(trackId)
      else next.add(trackId)
      return next
    })
  }

  const selectAll = () => {
    const selectable = results.filter(t => !isInPool(t.externalId)).map(t => t.id)
    setSelectedTrackIds(new Set(selectable))
  }

  const deselectAll = () => setSelectedTrackIds(new Set())

  const isInPool = (trackId: string) => curatedSongs.some(s => s.spotify_track_id === trackId)

  // Bulk add selected tracks
  const handleAddSelected = async () => {
    const tracksToAdd = results.filter(t => selectedTrackIds.has(t.id) && !isInPool(t.externalId))
    if (tracksToAdd.length === 0) return

    setAdding(true)
    setError(null)

    const rows = tracksToAdd.map(track => ({
      event_id: eventId,
      nominated_by: userId,
      spotify_track_id: track.externalId,
      title: track.title,
      artist: track.artist,
      album: track.album,
      album_art: track.albumArt,
      duration: track.duration,
      preview_url: track.previewUrl,
      release_year: track.releaseDate?.slice(0, 4) || null,
    }))

    const { error: insertError } = await supabase
      .from('event_song_nominations')
      .insert(rows)

    if (insertError) {
      setError(`Failed to add some songs. ${insertError.message}`)
      console.error('Bulk add error:', insertError)
    }

    // Refresh pool
    const { data } = await supabase
      .from('event_song_nominations')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
    setCuratedSongs(data || [])
    setSelectedTrackIds(new Set())
    setAdding(false)
  }

  // Single add
  const handleAddSingle = async (track: Track) => {
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
        release_year: track.releaseDate?.slice(0, 4) || null,
      })

    if (insertError) {
      if (insertError.code === '23505') setError('Already in pool.')
      else setError('Failed to add song.')
    } else {
      const { data } = await supabase
        .from('event_song_nominations')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
      setCuratedSongs(data || [])
    }
  }

  const handleRemove = async (nominationId: string) => {
    await supabase.from('event_song_nominations').delete().eq('id', nominationId)
    setCuratedSongs(prev => prev.filter(s => s.id !== nominationId))
  }

  const handlePreview = (track: Track) => {
    if (currentTrack?.id === track.id && isPlaying) stopPreview()
    else if (track.previewUrl) playPreview(track.previewUrl)
  }

  const clearFilters = () => {
    setSelectedGenres([])
    setArtistFilter('')
    setAlbumFilter('')
    setSelectedEras([])
    setSelectedTags([])
    setSort('relevance')
    setResultLimit(20)
    setQuery('')
  }

  const selectableCount = results.filter(t => !isInPool(t.externalId)).length
  const selectedCount = selectedTrackIds.size

  return (
    <div className="space-y-5">
      {/* Search input */}
      <div className="relative">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* Filters — always visible */}
      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 space-y-4">
        {/* Genre pills */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-2">Genres</label>
          <div className="flex flex-wrap gap-1.5">
            {POPULAR_GENRES.map((g) => (
              <button
                key={g}
                onClick={() => toggleGenre(g)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedGenres.includes(g)
                    ? 'bg-[#1DB954] text-black'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {g}
              </button>
            ))}
            <button
              onClick={() => setShowAllGenres(!showAllGenres)}
              className="px-3 py-1 rounded-full text-xs text-gray-500 hover:text-white border border-white/[0.06] transition-colors"
            >
              {showAllGenres ? 'Less' : `+${genres.length - POPULAR_GENRES.length} more`}
            </button>
          </div>
          {showAllGenres && (
            <div className="flex flex-wrap gap-1.5 mt-2 max-h-40 overflow-y-auto">
              {genres
                .filter(g => !POPULAR_GENRES.includes(g.slug))
                .map((g) => (
                  <button
                    key={g.id}
                    onClick={() => toggleGenre(g.slug)}
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                      selectedGenres.includes(g.slug)
                        ? 'bg-[#1DB954] text-black'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {g.name}
                  </button>
                ))}
            </div>
          )}
        </div>

        {/* Artist + Album */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Artists</label>
            <input
              type="text"
              value={artistFilter}
              onChange={(e) => setArtistFilter(e.target.value)}
              placeholder="e.g. Beatles, Queen, Radiohead"
              className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/20"
            />
          </div>
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
        </div>

        {/* Era pills — multi-select */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Era</label>
          <div className="flex flex-wrap gap-1.5">
            {ERA_PRESETS.map((era) => (
              <button
                key={era.label}
                onClick={() => toggleEra(era.label)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  selectedEras.includes(era.label)
                    ? 'bg-[#1DB954] text-black'
                    : 'bg-white/5 text-gray-300 hover:bg-white/10'
                }`}
              >
                {era.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tags — multi-select + Top N presets */}
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Tags</label>
            <div className="flex gap-1.5">
              {[
                { key: 'new', label: 'Recently released' },
                { key: 'hipster', label: 'Underground' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleTag(key)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    selectedTags.includes(key)
                      ? 'bg-[#1DB954] text-black'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Show</label>
            <div className="flex gap-1.5">
              {[
                { n: 20, label: 'Top 20' },
                { n: 50, label: 'Top 50' },
              ].map(({ n, label }) => (
                <button
                  key={n}
                  onClick={() => {
                    setResultLimit(n)
                    setSort('popularity_desc')
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    resultLimit === n && sort === 'popularity_desc'
                      ? 'bg-[#1DB954] text-black'
                      : 'bg-white/5 text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Sort</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/20 appearance-none"
            >
              <option value="relevance" className="bg-gray-900">Relevance</option>
              <option value="popularity_desc" className="bg-gray-900">Most popular</option>
              <option value="popularity_asc" className="bg-gray-900">Underground first</option>
            </select>
          </div>
        </div>

        {/* Clear all */}
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-white transition-colors">
            Clear all filters
          </button>
        )}
      </div>

      {/* Error */}
      {error && <p className="text-sm text-red-400 px-1">{error}</p>}

      {/* No results state */}
      {!loading && results.length === 0 && (query.trim() || selectedGenres.length > 0 || artistFilter.trim() || albumFilter.trim() || selectedEras.length > 0 || selectedTags.length > 0) && (
        <div className="text-center py-10 bg-white/[0.01] border border-white/[0.06] rounded-2xl">
          <svg className="w-10 h-10 text-gray-700 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-gray-400 mb-1">No songs found</p>
          <p className="text-xs text-gray-600">Try adjusting your filters or search query</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="text-center py-10">
          <div className="w-6 h-6 border-2 border-gray-700 border-t-gray-400 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-gray-600">Searching Spotify...</p>
        </div>
      )}

      {/* Results with checkboxes */}
      {!loading && results.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">{results.length} results</p>
            <div className="flex items-center gap-3">
              {selectableCount > 0 && (
                <button
                  onClick={selectedCount > 0 ? deselectAll : selectAll}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  {selectedCount > 0 ? 'Deselect all' : 'Select all'}
                </button>
              )}
              {selectedCount > 0 && (
                <button
                  onClick={handleAddSelected}
                  disabled={adding}
                  className="text-xs font-semibold px-4 py-1.5 rounded-full bg-[#1DB954] text-black hover:bg-[#1ed760] transition-colors disabled:opacity-50"
                >
                  {adding ? 'Adding...' : `Add ${selectedCount} to pool`}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-0.5 max-h-[28rem] overflow-y-auto">
            {results.map((track) => {
              const inPool = isInPool(track.externalId)
              const isSelected = selectedTrackIds.has(track.id) || inPool

              return (
                <div
                  key={track.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                    inPool ? 'opacity-40' : 'hover:bg-white/[0.03]'
                  }`}
                >
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={inPool}
                    onChange={() => toggleTrackSelection(track.id)}
                    className="w-4 h-4 accent-[#1DB954] flex-shrink-0 rounded"
                  />

                  {/* Album art */}
                  {track.albumArt ? (
                    <img
                      src={track.albumArt}
                      alt={track.album}
                      className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex-shrink-0 flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-100 truncate">{track.title}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 truncate">{track.artist}</span>
                      {track.releaseDate && (
                        <>
                          <span className="text-gray-700">&middot;</span>
                          <span className="text-[10px] text-gray-600">{track.releaseDate.slice(0, 4)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Popularity bar */}
                  {track.popularity !== undefined && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <div className="w-10 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-[#1DB954] rounded-full" style={{ width: `${track.popularity}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-600 w-5 text-right">{track.popularity}</span>
                    </div>
                  )}

                  {/* Preview */}
                  {track.previewUrl && (
                    <button
                      onClick={() => handlePreview(track)}
                      className="flex-shrink-0 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                    >
                      {currentTrack?.id === track.id && isPlaying ? (
                        <svg className="w-3 h-3 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      )}
                    </button>
                  )}

                  {/* Single add */}
                  {!inPool && (
                    <button
                      onClick={() => handleAddSingle(track)}
                      className="flex-shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full border border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-colors"
                    >
                      Add
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Curated pool */}
      {curatedSongs.length > 0 && (
        <div className="border-t border-white/[0.06] pt-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">
            Song Pool ({curatedSongs.length})
          </h3>
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
