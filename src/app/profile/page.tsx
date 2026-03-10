'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/types'

interface SpotifyData {
  genres: string[]
  tracks: any[]
  topArtists: any[]
}

export default function ProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [syncingSpotify, setSyncingSpotify] = useState(false)
  const [syncedGenres, setSyncedGenres] = useState(false)
  const [spotifyData, setSpotifyData] = useState<SpotifyData | null>(null)

  useEffect(() => {
    console.log('=== PROFILE RENDER ===')
    console.log('profile:', profile)
    console.log('profile?.top_genres:', profile?.top_genres)
    console.log('spotifyData:', spotifyData)
  }, [profile, spotifyData])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)

      // Try to get existing profile, create if doesn't exist
      let { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      // If profile doesn't exist, create it
      if (!profileData) {
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            avatar_url: user.user_metadata?.avatar_url || null,
          })
          .select()
          .single()

        if (insertError) {
          console.error('Error creating profile:', insertError)
        }
        profileData = newProfile
      }

      setProfile(profileData)
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    if (user && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      if (searchParams.get('autoSync') === 'true') {
        // Check if we just completed auth (don't re-trigger)
        const justAuthed = sessionStorage.getItem('just_authed')
        sessionStorage.removeItem('just_authed')
        
        if (justAuthed) {
          window.history.replaceState({}, '', '/profile')
          return
        }
        
        window.history.replaceState({}, '', '/profile')
        if (!syncingSpotify && !syncedGenres) {
          syncSpotifyData()
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const syncSpotifyData = async () => {
    setSyncingSpotify(true)
    console.log('=== SYNC SPOTIFY DATA START ===')
    try {
      const { getTopGenres, getTopTracks, getStoredAccessToken } = await import('@/lib/music-api/spotify-auth')

      // Debug: check localStorage
      console.log('All localStorage keys:', Object.keys(localStorage))
      console.log('spotify_access_token in localStorage:', localStorage.getItem('spotify_access_token'))

      // Check if authenticated with Spotify
      const token = getStoredAccessToken()
      console.log('Stored token (from getStoredAccessToken):', token ? 'present' : 'null')

      if (!token) {
        // Redirect to Spotify auth
        console.log('No token, redirecting to Spotify auth...')
        const { redirectToSpotifyAuth } = await import('@/lib/music-api/spotify-auth')
        await redirectToSpotifyAuth('/profile?autoSync=true')
        return
      }

      console.log('Token found, proceeding with sync...')
      console.log('Token value:', token.substring(0, 20) + '...')

      // Ensure profile exists first
      let { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      console.log('Existing profile:', existingProfile)

      if (!existingProfile) {
        console.log('Creating new profile...')
        const { data: newProfile } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
            avatar_url: user.user_metadata?.avatar_url || null,
          })
          .select()
          .single()

        existingProfile = newProfile
      }

      console.log('Fetching top genres from Spotify...')
      const genres = await getTopGenres()
      console.log('Top Genres result:', genres)

      console.log('Fetching top artists from Spotify...')
      const { getTopArtists } = await import('@/lib/music-api/spotify-auth')
      const topArtists = await getTopArtists()
      console.log('Top Artists result:', topArtists)

      console.log('Fetching top tracks from Spotify...')
      const tracks = await getTopTracks()
      console.log('Top Tracks result:', tracks)

      console.log('Saving genres to profile:', genres)
      console.log('Saving tracks to profile:', tracks.length, 'tracks')

      const updateResult = await supabase
        .from('profiles')
        .update({
          top_genres: genres,
        })
        .eq('id', user.id)

      console.log('Update result:', updateResult)

      const spotifyData = { genres, tracks, topArtists }
      console.log('Setting spotifyData state:', spotifyData)
      setSpotifyData(spotifyData)

      // Refresh profile
      const { data: updatedProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      console.log('Updated profile:', updatedProfile)
      setProfile(updatedProfile)
      setSyncedGenres(true)
      setTimeout(() => setSyncedGenres(false), 3000)
      console.log('=== SYNC SPOTIFY DATA COMPLETE ===')
    } catch (err) {
      console.error('Error syncing Spotify data:', err)
    }
    setSyncingSpotify(false)
  }

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
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xl font-bold">TuneTribe</Link>
            <Link href="/" className="text-gray-400 hover:text-white text-sm">← Back</Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="bg-gradient-to-br from-gray-900 via-gray-900 to-[#1DB954]/10 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#1DB954] to-[#191414] flex items-center justify-center text-3xl font-bold text-white shadow-lg">
              {profile?.username?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">{profile?.username || 'Music Lover'}</h1>
              <p className="text-gray-400">{user?.email}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-sm text-gray-500">Member since {new Date(user?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                <span className="text-gray-600">•</span>
                <span className="text-sm text-gray-500">{profile?.city || 'Toronto'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Spotify Sync */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#1DB954] flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold">Spotify</h2>
                <p className="text-sm text-gray-400">Connected</p>
              </div>
            </div>
            <button
              onClick={syncSpotifyData}
              disabled={syncingSpotify}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${syncedGenres
                ? 'bg-green-500/20 text-green-400'
                : 'bg-[#1DB954]/20 text-[#1DB954] hover:bg-[#1DB954]/30'
                }`}
            >
              {syncingSpotify ? 'Syncing...' : syncedGenres ? 'Synced!' : 'Sync Top Data'}
            </button>
          </div>
        </div>

        {/* Top Genres */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Your Top Genres</h2>
          {spotifyData?.genres && spotifyData.genres.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {spotifyData.genres.map((genre, index) => (
                <span
                  key={genre}
                  className="px-4 py-2 bg-[#1DB954]/20 text-[#1DB954] rounded-full text-sm font-medium"
                  style={{ opacity: 1 - (index * 0.1) }}
                >
                  {genre}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No genres synced yet. Click "Sync Top Data" to fetch your top genres from Spotify.</p>
          )}
        </div>

        {/* Top Artists */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Your Top Artists</h2>
          {spotifyData?.topArtists && spotifyData.topArtists.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {spotifyData.topArtists.slice(0, 10).map((artist: any) => (
                <div key={artist.id} className="text-center">
                  <div className="w-20 h-20 mx-auto rounded-full overflow-hidden bg-gray-800 mb-2">
                    {artist.image ? (
                      <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">
                        {artist.name[0]}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-white truncate">{artist.name}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No artists synced yet. Click "Sync Top Data" to fetch your top artists from Spotify.</p>
          )}
        </div>

        {/* Top Tracks */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Your Top Tracks</h2>
          {spotifyData?.tracks && spotifyData.tracks.length > 0 ? (
            <div className="space-y-3">
              {spotifyData.tracks.slice(0, 10).map((track: any, index: number) => (
                <div key={track.id || index} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-800">
                  <span className="text-gray-500 w-6 text-center">{index + 1}</span>
                  <div className="w-12 h-12 rounded overflow-hidden bg-gray-800 flex-shrink-0">
                    {track.albumArt ? (
                      <img src={track.albumArt} alt={track.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{track.title}</p>
                    <p className="text-gray-400 text-sm truncate">{track.artist}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No tracks synced yet. Click "Sync Top Data" to fetch your top tracks from Spotify.</p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-900 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#1DB954]">{profile?.top_genres?.length || 0}</div>
            <div className="text-sm text-gray-400">Top Genres</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#1DB954]">{profile?.city || 'Toronto'}</div>
            <div className="text-sm text-gray-400">City</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#1DB954]">
              {new Date(user?.created_at || Date.now()).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </div>
            <div className="text-sm text-gray-400">Member Since</div>
          </div>
          <div className="bg-gray-900 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-[#1DB954]">1</div>
            <div className="text-sm text-gray-400">Connected Apps</div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-gray-900 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Account Settings</h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-800">
              <div>
                <p className="font-medium">Display Name</p>
                <p className="text-sm text-gray-400">{profile?.username || 'Not set'}</p>
              </div>
              <button className="text-[#1DB954] text-sm hover:underline">Edit</button>
            </div>

            <div className="flex items-center justify-between py-3 border-b border-gray-800">
              <div>
                <p className="font-medium">City</p>
                <p className="text-sm text-gray-400">{profile?.city || 'Toronto'}</p>
              </div>
              <button className="text-[#1DB954] text-sm hover:underline">Edit</button>
            </div>

            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">Email</p>
                <p className="text-sm text-gray-400">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium py-3 px-4 rounded-lg transition-colors border border-red-500/30"
        >
          Sign Out
        </button>
      </main>
    </div>
  )
}
