'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Event, Genre, City, Profile } from '@/lib/types'

function ProfileMenu({ user, profile, onLogout }: { user: any, profile: Profile | null, onLogout: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const needsSync = profile && (!profile.top_genres || profile.top_genres.length === 0)

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 hover:bg-gray-800 px-3 py-2 rounded-lg transition-colors"
      >
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center text-sm font-bold text-black">
            {profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
          </div>
          {needsSync && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-gray-900"></div>
          )}
        </div>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-lg shadow-xl py-1 z-50">
          <Link
            href="/profile"
            className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Profile
            {needsSync && <span className="ml-2 text-xs text-yellow-400">•</span>}
          </Link>
          <Link
            href="/events/new"
            className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Create Event
          </Link>
          <hr className="my-1 border-gray-800" />
          <button
            onClick={() => {
              setIsOpen(false)
              onLogout()
            }}
            className="block w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-800 transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

export default function HomePage() {
  const supabase = createClient()
  const [events, setEvents] = useState<Event[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [selectedCity, setSelectedCity] = useState('Toronto')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      const [genresRes, citiesRes] = await Promise.all([
        supabase.from('genres').select('*'),
        supabase.from('cities').select('*').eq('is_active', true)
      ])

      setGenres(genresRes.data || [])
      setCities(citiesRes.data || [])

      if (user) {
        let { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()

        // Create profile if doesn't exist
        if (!profileData) {
          const { data: newProfile } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              username: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
              avatar_url: user.user_metadata?.avatar_url || null,
            })
            .select()
            .single()
          
          profileData = newProfile
        }

        setProfile(profileData)

        if (profileData?.top_genres?.length) {
          setSelectedGenres(profileData.top_genres)
        }
      }

      setLoading(false)
    }
    init()
  }, [])

  // Refresh profile data when page becomes visible (e.g., after syncing in profile)
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
            setSelectedGenres(profileData.top_genres)
          }
        }
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [user, selectedGenres.length])

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
        const genreIds = genres.filter(g => selectedGenres.includes(g.name)).map(g => g.id)
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
    setSelectedGenres(prev =>
      prev.includes(genre)
        ? prev.filter(g => g !== genre)
        : [...prev, genre]
    )
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const needsGenreSync = user && profile && (!profile.top_genres || profile.top_genres.length === 0)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold">TuneTribe</Link>

            <div className="flex items-center gap-3">
              {user ? (
                <ProfileMenu user={user} profile={profile} onLogout={handleLogout} />
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    href="/login"
                    className="text-gray-300 hover:text-white text-sm font-medium px-3 py-2"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/login"
                    className="bg-[#1DB954] hover:bg-[#1ed760] text-black text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

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

            {/* Genre Tags - Scrollable on mobile */}
            <div className="flex-1 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
              <div className="flex flex-nowrap md:flex-wrap gap-2 min-w-max md:min-w-0">
                {genres.slice(0, 10).map((genre) => (
                  <button
                    key={genre.id}
                    onClick={() => toggleGenre(genre.name)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                      selectedGenres.includes(genre.name)
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
            <h2 className="text-lg font-semibold">
              {selectedCity === 'toronto' ? 'Toronto' : selectedCity}
              {selectedGenres.length > 0 && (
                <span className="text-gray-400 font-normal"> · {selectedGenres.join(', ')}</span>
              )}
            </h2>
            <span className="text-sm text-gray-500">{events.length} events</span>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-16 bg-gray-900/50 rounded-xl">
              <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
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
                        <svg className="w-12 h-12 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                        </svg>
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
