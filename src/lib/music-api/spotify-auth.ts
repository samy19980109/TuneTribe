import type { Track, MusicSource, TopArtist } from '../types'
import { normalizeGenres } from './genres'

const CLIENT_ID = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!
const REDIRECT_URI = typeof window !== 'undefined'
  ? `${window.location.origin.replace('localhost', '127.0.0.1')}/callback`
  : `${(process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3000').replace('localhost', '127.0.0.1')}/callback`
const SCOPES = [
  'user-read-private',
  'user-read-email',
  'user-top-read',
  'user-library-read',
].join(' ')

function generateCodeVerifier(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let text = ''
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await window.crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function redirectToSpotifyAuth(next?: string): Promise<void> {
  const verifier = generateCodeVerifier(128)
  const challenge = await generateCodeChallenge(verifier)

  const state = JSON.stringify({ verifier, next: next || '/' })
  const encodedState = btoa(state).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  const params = new URLSearchParams()
  params.append('client_id', CLIENT_ID)
  params.append('response_type', 'code')
  params.append('redirect_uri', REDIRECT_URI)
  params.append('scope', SCOPES)
  params.append('code_challenge_method', 'S256')
  params.append('code_challenge', challenge)
  params.append('state', encodedState)

  document.location = `https://accounts.spotify.com/authorize?${params.toString()}`
}

export async function getAccessTokenFromCode(code: string, verifier?: string): Promise<{ accessToken: string; refreshToken: string }> {
  if (!verifier) {
    throw new Error('No verifier found. Please try again.')
  }

  const params = new URLSearchParams()
  params.append('client_id', CLIENT_ID)
  params.append('grant_type', 'authorization_code')
  params.append('code', code)
  params.append('redirect_uri', REDIRECT_URI)
  params.append('code_verifier', verifier)

  const result = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  const data = await result.json()

  if (!result.ok) {
    throw new Error(`Token exchange failed: ${data.error_description || result.statusText}`)
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || '',
  }
}

function getLocalStorage(): { get: (name: string) => string | null; set: (name: string, value: string) => void } {
  return {
    get: (name: string) => {
      if (typeof window === 'undefined') return null
      return localStorage.getItem(name)
    },
    set: (name: string, value: string) => {
      if (typeof window === 'undefined') return
      localStorage.setItem(name, value)
    }
  }
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getLocalStorage().get('spotify_refresh_token')
  if (!refreshToken) {
    return null
  }

  const params = new URLSearchParams()
  params.append('client_id', CLIENT_ID)
  params.append('grant_type', 'refresh_token')
  params.append('refresh_token', refreshToken)

  const result = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  const data = await result.json()

  if (!result.ok) {
    console.error('Token refresh failed:', data)
    return null
  }

  // Store new token
  getLocalStorage().set('spotify_access_token', data.access_token)
  if (data.refresh_token) {
    getLocalStorage().set('spotify_refresh_token', data.refresh_token)
  }

  return data.access_token
}

export function getStoredAccessToken(): string | null {
  return getLocalStorage().get('spotify_access_token')
}

interface SpotifyApiResponse {
  items?: SpotifyArtistItem[] | SpotifyTrackItem[]
  [key: string]: unknown
}

interface SpotifyArtistItem {
  id: string
  name: string
  images?: { url: string }[]
}

interface SpotifyTrackItem {
  id: string
  name: string
  artists: { name: string }[]
  album: { name: string; images?: { url: string }[] }
  duration_ms: number
  preview_url: string | null
}

export async function fetchSpotifyApi(endpoint: string, token: string): Promise<SpotifyApiResponse> {
  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  // If token expired, try to refresh
  if (response.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      const retryResponse = await fetch(`https://api.spotify.com/v1${endpoint}`, {
        headers: { Authorization: `Bearer ${newToken}` },
      })

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text()
        console.error('Spotify API error after refresh:', errorText)
        throw new Error(`Spotify API error: ${retryResponse.status} ${retryResponse.statusText}`)
      }

      return retryResponse.json()
    }
    throw new Error('Token expired and refresh failed')
  }

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Spotify API error response:', errorText)
    throw new Error(`Spotify API error: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

export async function getTopGenres(): Promise<string[]> {
  const token = getStoredAccessToken()

  if (!token) {
    throw new Error('Not authenticated with Spotify')
  }

  // Get top artists from Spotify (get 30 to ensure we have enough for genre lookup)
  const artistsData = await fetchSpotifyApi('/me/top/artists?time_range=medium_term&limit=30', token)

  if (!artistsData.items?.length) {
    return []
  }

  const genreCounts = new Map<string, number>()

  // Get artist names for MusicBrainz lookup
  const artistNames = (artistsData.items || []).slice(0, 20).map((a: { name: string }) => a.name)

  for (const name of artistNames) {
    try {
      const response = await fetch(`/api/artist/${encodeURIComponent(name)}`)
      const data = await response.json()
      const genres = data.genres || []
      for (const genre of genres) {
        genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1)
      }
    } catch (error) {
      console.error(`Error fetching genres for ${name}:`, error)
    }

    await new Promise(resolve => setTimeout(resolve, 1100))
  }

  if (genreCounts.size === 0) {
    return []
  }

  const sortedGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([genre]) => genre)

  return normalizeGenres(sortedGenres)
}

export async function getTopArtists(): Promise<TopArtist[]> {
  const token = getStoredAccessToken()

  if (!token) {
    throw new Error('Not authenticated with Spotify')
  }

  const data = await fetchSpotifyApi('/me/top/artists?time_range=medium_term&limit=20', token)

  const artists = (data.items || []) as SpotifyArtistItem[]
  return artists.map((artist) => ({
    id: artist.id,
    name: artist.name,
    image: artist.images?.[0]?.url || null,
  }))
}

export async function getTopTracks(): Promise<Track[]> {
  const token = getStoredAccessToken()

  if (!token) {
    throw new Error('Not authenticated with Spotify')
  }

  const data = await fetchSpotifyApi('/me/top/tracks?time_range=medium_term&limit=10', token)

  const tracks = (data.items || []) as SpotifyTrackItem[]
  return tracks.map((track) => ({
    id: track.id,
    source: 'spotify' as MusicSource,
    title: track.name,
    artist: track.artists.map((a) => a.name).join(', '),
    album: track.album.name,
    albumArt: track.album.images?.[0]?.url || '',
    duration: track.duration_ms / 1000,
    previewUrl: track.preview_url,
    trackNumber: 0,
    externalId: track.id,
  }))
}
