'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Event, Genre, City, Profile } from '@/lib/types'
import AppHeader from '@/components/AppHeader'
import LoadingScreen from '@/components/LoadingScreen'
import MusicNoteIcon from '@/components/icons/MusicNoteIcon'
import { ensureProfile } from '@/lib/supabase/profile'
import { useAuthStore } from '@/stores/useAuthStore'

// Module-level singleton — stable reference, no re-creation on each render
const supabase = createClient()

export default function HomePage() {
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
  }, [fetchUser])

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
  const isGenreSelected = useCallback(
    (g: Genre) => selectedGenres.some(sg => sg.toLowerCase() === g.name.toLowerCase()),
    [selectedGenres]
  )

  // Fetch events when city/genre/cities/genres change
  useEffect(() => {
    const fetchEvents = async () => {
      const cityId = cities.find(c => c.slug === selectedCity)?.id || cities[0]?.id

      const today = new Date().toISOString().split('T')[0]
      let query = supabase
        .from('events')
        .select('*, city:cities(*), genre:genres(*), organizer:profiles!events_organizer_id_fkey(*)')
        .or(`date.gte.${today},date.is.null`)
        .order('date', { ascending: true, nullsFirst: false })

      if (cityId) {
        query = query.or(`city_id.eq.${cityId},city_id.is.null`)
      }

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
  }, [selectedCity, selectedGenres, cities, genres, isGenreSelected])

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
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  const needsGenreSync = user && profile && (!profile.top_genres || profile.top_genres.length === 0)
  const hasPersonalization = profile?.top_genres && profile.top_genres.length > 0
  const currentCityName = cities.find(c => c.slug === selectedCity)?.name || cities[0]?.name || ''

  if (authLoading || dataLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <AppHeader user={user} onSignOut={handleSignOut} />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-gray-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(29,185,84,0.08),transparent_60%)]" />

        <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-12">
          {hasPersonalization ? (
            <>
              <p className="text-sm font-medium tracking-widest uppercase text-[#1DB954] mb-4">
                Curated for you
              </p>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
                Live music, matched
                <br />
                <span className="text-gray-400">to your sound.</span>
              </h1>

              {/* User's top genres */}
              <div className="mb-8">
                <p className="text-sm text-gray-500 mb-3">Your listening profile</p>
                <div className="flex flex-wrap gap-2">
                  {profile.top_genres.slice(0, 8).map((genre) => (
                    <span
                      key={genre}
                      className="px-4 py-1.5 rounded-full text-sm font-medium border border-white/10 bg-white/5 text-gray-200"
                    >
                      {genre}
                    </span>
                  ))}
                  {profile.top_genres.length > 8 && (
                    <span className="px-4 py-1.5 rounded-full text-sm text-gray-500 border border-white/5">
                      +{profile.top_genres.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : user ? (
            <>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
                Discover events
                <br />
                <span className="text-gray-400">you&apos;ll actually love.</span>
              </h1>
              <p className="text-lg text-gray-400 mb-8 max-w-xl">
                Connect your music account to get personalized event recommendations based on what you actually listen to.
              </p>
              <Link
                href="/profile"
                className="inline-flex items-center gap-2 bg-white text-black font-semibold px-6 py-3 rounded-full hover:bg-gray-100 transition-colors text-sm"
              >
                Connect your music
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
                Find listening events
                <br />
                <span className="text-gray-400">that match your taste.</span>
              </h1>
              <p className="text-lg text-gray-400 mb-8 max-w-xl">
                TuneTribe surfaces live music events based on your listening habits — not algorithms, not ads, just your sound.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 bg-white text-black font-semibold px-6 py-3 rounded-full hover:bg-gray-100 transition-colors text-sm"
              >
                Get started
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Genre Sync Banner */}
      {needsGenreSync && (
        <div className="max-w-6xl mx-auto px-4 mb-8">
          <div className="flex items-center justify-between bg-white/[0.03] border border-white/[0.06] rounded-2xl px-6 py-4">
            <div>
              <p className="text-sm font-medium text-white mb-0.5">Personalize your feed</p>
              <p className="text-sm text-gray-500">
                Connect your music account to see events matched to your listening habits.
              </p>
            </div>
            <Link
              href="/profile"
              className="flex-shrink-0 text-sm bg-white text-black font-semibold px-4 py-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              Sync Now
            </Link>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 pb-16">
        {/* Filters */}
        <div className="flex flex-col gap-4 mb-10">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            {/* City Selector */}
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-transparent border border-white/10 rounded-full px-4 py-2 text-white text-sm focus:outline-none focus:border-white/30 w-full md:w-auto appearance-none cursor-pointer hover:border-white/20 transition-colors"
            >
              {cities.map((city) => (
                <option key={city.id} value={city.slug} className="bg-gray-900">
                  {city.name}, {city.state}
                </option>
              ))}
            </select>

            {/* Genre Dropdown */}
            <div className="relative" ref={genreDropdownRef}>
              <button
                onClick={() => setGenreDropdownOpen(!genreDropdownOpen)}
                className="border border-white/10 rounded-full px-4 py-2 text-sm text-white flex items-center gap-2 hover:border-white/20 transition-colors"
              >
                <span>Genres</span>
                {selectedGenres.length > 0 && (
                  <span className="bg-[#1DB954] text-black text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {selectedGenres.length}
                  </span>
                )}
                <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {genreDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 bg-gray-900 border border-white/10 rounded-2xl shadow-2xl z-50 max-h-80 overflow-y-auto">
                  {profile?.top_genres && profile.top_genres.length > 0 && (
                    <div className="p-3 border-b border-white/5">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-1 mb-2">Your Genres</p>
                      <div className="flex flex-wrap gap-1.5">
                        {profile.top_genres.slice(0, 10).map((genre) => (
                          <button
                            key={`user-${genre}`}
                            onClick={() => toggleGenre(genre)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                              selectedGenres.some(sg => sg.toLowerCase() === genre.toLowerCase())
                                ? 'bg-[#1DB954] text-black'
                                : 'bg-white/5 text-gray-300 hover:bg-white/10'
                            }`}
                          >
                            {genre}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider px-1 mb-2">All Genres</p>
                    <div className="flex flex-wrap gap-1.5">
                      {genres.map((genre) => (
                        <button
                          key={genre.id}
                          onClick={() => toggleGenre(genre.name)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            isGenreSelected(genre)
                              ? 'bg-[#1DB954] text-black'
                              : 'bg-white/5 text-gray-300 hover:bg-white/10'
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

            {/* Clear Filters */}
            {selectedGenres.length > 0 && (
              <button
                onClick={() => setSelectedGenres([])}
                className="text-xs text-gray-500 hover:text-white transition-colors"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Active genre pills — horizontal scroll */}
          {selectedGenres.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              {selectedGenres.slice(0, 12).map((genre) => (
                <button
                  key={genre}
                  onClick={() => toggleGenre(genre)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-[#1DB954]/10 text-[#1DB954] border border-[#1DB954]/20 hover:bg-[#1DB954]/20 transition-colors whitespace-nowrap group"
                >
                  {genre}
                  <svg className="w-3 h-3 opacity-50 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              ))}
              {selectedGenres.length > 12 && (
                <span className="px-3 py-1.5 text-xs text-gray-500 whitespace-nowrap">
                  +{selectedGenres.length - 12} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Events Section */}
        <div>
          <div className="flex items-baseline justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">{currentCityName}</h2>
              <p className="text-sm text-gray-500 mt-1">
                {events.length} {events.length === 1 ? 'event' : 'events'}
                {hasPersonalization && ' matching your taste'}
              </p>
            </div>
            {user && (
              <Link
                href="/events/new"
                className="text-sm text-gray-400 hover:text-white transition-colors font-medium"
              >
                + Create event
              </Link>
            )}
          </div>

          {events.length === 0 ? (
            <div className="text-center py-24 rounded-3xl border border-white/[0.04] bg-white/[0.01]">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-5">
                <MusicNoteIcon className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-gray-400 text-lg font-medium mb-2">No events found</p>
              <p className="text-gray-600 text-sm mb-6 max-w-sm mx-auto">
                {selectedGenres.length > 0
                  ? 'Try clearing your genre filters or check back soon.'
                  : 'Be the first to create a listening event in your city.'}
              </p>
              {user && (
                <Link
                  href="/events/new"
                  className="inline-flex items-center gap-2 bg-white text-black font-semibold px-6 py-3 rounded-full hover:bg-gray-100 transition-colors text-sm"
                >
                  Create an event
                </Link>
              )}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/events/${event.id}`}
                  className="group rounded-2xl overflow-hidden bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 hover:bg-white/[0.04]"
                >
                  {/* Image */}
                  <div className="aspect-[16/10] bg-gray-900 relative overflow-hidden">
                    {event.cover_image ? (
                      <img
                        src={event.cover_image}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
                        <MusicNoteIcon className="w-10 h-10 text-gray-700" />
                      </div>
                    )}
                    {event.genre && (
                      <div className="absolute top-3 left-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider bg-black/50 backdrop-blur-md text-white px-2.5 py-1 rounded-full">
                          {event.genre.name}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2.5">
                      {event.is_recurring ? (
                        <span className="text-[#1DB954] font-medium">
                          {event.recurring_pattern?.replace('_', ' ')}
                        </span>
                      ) : event.date ? (
                        <>
                          <span className="font-medium text-gray-300">{formatDate(event.date)}</span>
                          {event.time && (
                            <>
                              <span className="text-gray-700">/</span>
                              <span>{event.time}</span>
                            </>
                          )}
                        </>
                      ) : (
                        <span className="text-gray-600">Date TBD</span>
                      )}
                    </div>
                    <h3 className="font-semibold text-[15px] leading-snug mb-1.5 line-clamp-2 group-hover:text-white transition-colors text-gray-100">
                      {event.title}
                    </h3>
                    <p className="text-gray-500 text-sm line-clamp-1">{event.venue}</p>
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
