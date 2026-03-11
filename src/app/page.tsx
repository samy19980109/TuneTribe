'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Event, Genre, City, Profile } from '@/lib/types'
import AppHeader from '@/components/AppHeader'
import LoadingScreen from '@/components/LoadingScreen'
import MusicNoteIcon from '@/components/icons/MusicNoteIcon'
import { ensureProfile } from '@/lib/supabase/profile'
import { useAuthStore } from '@/stores/useAuthStore'

export default function HomePage() {
  const supabase = createClient()
  const { user, loading: authLoading, fetchUser, signOut } = useAuthStore()

  const [events, setEvents] = useState<Event[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedCity, setSelectedCity] = useState('')
  const [dataLoading, setDataLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false)
  const genreDropdownRef = useRef<HTMLDivElement>(null)

  // Fetch auth state on mount
  useEffect(() => {
    fetchUser()
  }, [])

  // Load genres and cities on mount
  useEffect(() => {
    const init = async () => {
      const [genresRes, citiesRes] = await Promise.all([
        supabase.from('genres').select('*'),
        supabase.from('cities').select('*').eq('is_active', true),
      ])
      setGenres(genresRes.data || [])
      const loadedCities: City[] = citiesRes.data || []
      setCities(loadedCities)
      if (loadedCities.length > 0) {
        setSelectedCity(loadedCities[0].slug)
      }
      setDataLoading(false)
    }
    init()
  }, [])

  // Ensure profile exists and seed genre selections when user is available
  useEffect(() => {
    if (!user) return
    const initProfile = async () => {
      const profileData = await ensureProfile(user)
      setProfile(profileData)
      if (profileData.top_genres?.length) {
        setSelectedGenres(profileData.top_genres.slice(0, 20))
      }
    }
    initProfile()
  }, [user])

  // Refresh profile data when page becomes visible (e.g. after syncing in profile)
  useEffect(() => {
    const handleVisibility = async () => {
      if (document.visibilityState === 'visible' && user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        if (profileData) {
          setProfile(profileData)
          if (profileData.top_genres?.length && selectedGenres.length === 0) {
            setSelectedGenres(profileData.top_genres.slice(0, 20))
          }
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [user, selectedGenres.length])

  // Genre dropdown click-outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (genreDropdownRef.current && !genreDropdownRef.current.contains(event.target as Node)) {
        setGenreDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Helper: is a genre currently selected?
  const isGenreSelected = (g: Genre) =>
    selectedGenres.some(sg => sg.toLowerCase() === g.name.toLowerCase())

  // Fetch events when city/genre/cities/genres change
  useEffect(() => {
    const fetchEvents = async () => {
      const cityId = cities.find(c => c.slug === selectedCity)?.id || cities[0]?.id
      if (!cityId) return

      let query = supabase
        .from('events')
        .select('*, city:cities(*), genre:genres(*), organizer:profiles(*)')
        .eq('city_id', cityId)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })

      if (selectedGenres.length > 0) {
        const genreIds = genres
          .filter(g => isGenreSelected(g))
          .map(g => g.id)
        if (genreIds.length > 0) {
          query = query.in('genre_id', genreIds)
        }
      }

      const { data } = await query
      setEvents(data || [])
    }

    if (cities.length > 0) {
      fetchEvents()
    }
  }, [selectedCity, selectedGenres, cities, genres])

  const toggleGenre = (genre: string) => {
    const normalizedGenre = genre.toLowerCase()
    setSelectedGenres(prev => {
      const hasGenre = prev.some(g => g.toLowerCase() === normalizedGenre)
      return hasGenre
        ? prev.filter(g => g.toLowerCase() !== normalizedGenre)
        : [...prev, genre]
    })
  }

  const handleSignOut = async () => {
    await signOut()
    window.location.href = '/'
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const needsGenreSync = user && profile && (!profile.top_genres || profile.top_genres.length === 0)
  const currentCityName = cities.find(c => c.slug === selectedCity)?.name || cities[0]?.name || ''

  if (authLoading || dataLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <AppHeader user={user} onSignOut={handleSignOut} />

      {/* Genre Sync Banner */}
      {needsGenreSync && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/30">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-yellow-200">
                Connect your Spotify to get personalized event recommendations based on your music taste.
              </p>
              <Link
                href="/profile"
                className="text-sm bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 px-3 py-1 rounded-lg font-medium transition-colors"
              >
                Sync Now
              </Link>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Filters Section */}
        <div className="bg-gray-900/50 rounded-xl p-4 md:p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* City Selector */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-gray-400 mb-1 md:hidden">
                City
              </label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#1DB954] w-full md:w-auto"
              >
                {cities.map((city) => (
                  <option key={city.id} value={city.slug}>
                    {city.name}, {city.state}
                  </option>
                ))}
              </select>
            </div>

            {/* Genre Dropdown */}
            <div className="relative flex-shrink-0" ref={genreDropdownRef}>
              <button
                onClick={() => setGenreDropdownOpen(!genreDropdownOpen)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white flex items-center gap-2 hover:bg-gray-700 transition-colors"
              >
                <span>All Genres</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {genreDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                  {profile?.top_genres && profile.top_genres.length > 0 && (
                    <div className="p-2 border-b border-gray-800">
                      <p className="text-xs font-medium text-gray-500 px-2 py-1">Your Top Genres</p>
                      <div className="flex flex-wrap gap-1">
                        {profile.top_genres.slice(0, 10).map((genre) => (
                          <button
                            key={`user-${genre}`}
                            onClick={() => toggleGenre(genre)}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                              selectedGenres.some(sg => sg.toLowerCase() === genre.toLowerCase())
                                ? 'bg-[#1DB954] text-black'
                                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                            }`}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-xs font-medium text-gray-500 px-2 py-1">All Genres</p>
                    <div className="flex flex-wrap gap-1">
                      {genres.map((genre) => (
                        <button
                          key={genre.id}
                          onClick={() => toggleGenre(genre.name)}
                          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                            isGenreSelected(genre)
                              ? 'bg-[#1DB954] text-black'
                              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                          }`}
                        >
                          {genre.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Genre Tags - Scrollable on mobile */}
            <div className="flex-1 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              <div className="flex flex-nowrap md:flex-wrap gap-2 min-w-max md:min-w-0">
                {genres.slice(0, 15).map((genre) => (
                  <button
                    key={genre.id}
                    onClick={() => toggleGenre(genre.name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                      isGenreSelected(genre)
                        ? 'bg-[#1DB954] text-black'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            {selectedGenres.length > 0 && (
              <button
                onClick={() => setSelectedGenres([])}
                className="text-xs text-gray-400 hover:text-white underline flex-shrink-0"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Events Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{currentCityName}</h2>
            <span className="text-sm text-gray-500">{events.length} events</span>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-16 bg-gray-900/50 rounded-xl">
              <MusicNoteIcon className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400 mb-4">No listening events found</p>
              {user && (
                <Link
                  href="/events/new"
                  className="inline-block bg-[#1DB954] hover:bg-[#1ed760] text-black font-medium px-6 py-2 rounded-lg transition-colors"
                >
                  Create the first event
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="group bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-[#1DB954]/50 transition-all hover:shadow-lg hover:shadow-[#1DB954]/5"
                >
                  <div className="aspect-video bg-gray-800 relative overflow-hidden">
                    {event.cover_image ? (
                      <img
                        src={event.cover_image}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <MusicNoteIcon className="w-12 h-12 text-gray-700" />
                      </div>
                    )}
                    {event.genre && (
                      <div className="absolute top-3 left-3">
                        <span className="text-xs font-medium bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded">
                          {event.genre.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-base mb-1 line-clamp-1 group-hover:text-[#1DB954] transition-colors">
                      {event.title}
                    </h3>
                    <p className="text-gray-400 text-sm mb-2 line-clamp-1">{event.venue}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      {event.is_recurring ? (
                        <span className="text-blue-400">{event.recurring_pattern?.replace('_', ' ')}</span>
                      ) : event.date ? (
                        <>
                          <span>{formatDate(event.date)}</span>
                          {event.time && <span>· {event.time}</span>}
                        </>
                      ) : (
                        <span>TBD</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
