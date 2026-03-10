import type { Album, Track, MusicSource } from '../types'
import type { MusicProvider } from './types'

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

function getCookies(): { get: (name: string) => string | null; set: (name: string, value: string, options?: any) => void } {
  return {
    get: (name: string) => {
      if (typeof document === 'undefined') return null
      const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
      return match ? decodeURIComponent(match[2]) : null
    },
    set: (name: string, value: string, options: any = {}) => {
      if (typeof document === 'undefined') return
      let cookie = `${name}=${encodeURIComponent(value)}`
      if (options.maxAge) cookie += `; Max-Age=${options.maxAge}`
      if (options.path) cookie += `; path=${options.path}`
      cookie += '; SameSite=Lax'

      // If we are on HTTPS, ensure Secure flag
      if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        cookie += '; Secure'
      }

      document.cookie = cookie
    }
  }
}

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
      if (typeof localStorage === 'undefined') return null
      return localStorage.getItem(name)
    },
    set: (name: string, value: string) => {
      if (typeof localStorage === 'undefined') return
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

export async function fetchSpotifyApi(endpoint: string, token: string): Promise<any> {
  console.log('fetchSpotifyApi called with endpoint:', endpoint)
  console.log('Token (first 20 chars):', token.substring(0, 20) + '...')
  
  const response = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  console.log('Response status:', response.status, response.statusText)
  
  // If token expired, try to refresh
  if (response.status === 401) {
    console.log('Token expired, attempting refresh...')
    const newToken = await refreshAccessToken()
    if (newToken) {
      console.log('Token refreshed, retrying request...')
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
  console.log('=== getTopGenres called ===')

  const token = getStoredAccessToken()
  console.log('Token in getTopGenres:', token ? 'present' : 'null')
  
  if (!token) {
    throw new Error('Not authenticated with Spotify')
  }

  // Get top artists from Spotify (get 30 to ensure we have enough for genre lookup)
  console.log('Calling Spotify API for top artists...')
  const artistsData = await fetchSpotifyApi('/me/top/artists?time_range=medium_term&limit=30', token)

  if (!artistsData.items?.length) {
    console.log('No top artists found')
    return []
  }

  const genreCounts = new Map<string, number>()

  // Get artist names for MusicBrainz lookup
  const artistNames = (artistsData.items || []).slice(0, 20).map((a: { name: string }) => a.name)
  
  console.log('Fetching genres from MusicBrainz for:', artistNames)

  for (const name of artistNames) {
    try {
      const response = await fetch(`/api/artist/${encodeURIComponent(name)}`)
      const data = await response.json()
      const genres = data.genres || []
      console.log(`${name}: ${genres.join(', ')}`)
      for (const genre of genres) {
        genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1)
      }
    } catch (error) {
      console.log(`Error for ${name}:`, error)
    }
    
    await new Promise(resolve => setTimeout(resolve, 1100))
  }

  if (genreCounts.size === 0) {
    console.log('No genres found!')
    return []
  }

  const sortedGenres = Array.from(genreCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([genre]) => genre)

  console.log('Sorted genres:', sortedGenres)

  const normalized = normalizeGenres(sortedGenres)
  console.log('Normalized genres:', normalized)
  
  return normalized
}

export interface TopArtist {
  id: string
  name: string
  image: string
}

export async function getTopArtists(): Promise<TopArtist[]> {
  console.log('=== getTopArtists called ===')
  
  const token = getStoredAccessToken()
  console.log('Token in getTopArtists:', token ? 'present' : 'null')
  
  if (!token) {
    throw new Error('Not authenticated with Spotify')
  }

  console.log('Calling Spotify API for top artists...')
  const data = await fetchSpotifyApi('/me/top/artists?time_range=medium_term&limit=20', token)
  console.log('Top Artists count:', data.items?.length)

  return data.items?.map((artist: any) => ({
    id: artist.id,
    name: artist.name,
    image: artist.images?.[0]?.url || '',
  })) || []
}

export async function getTopTracks(): Promise<Track[]> {
  console.log('=== getTopTracks called ===')
  
  const token = getStoredAccessToken()
  console.log('Token in getTopTracks:', token ? 'present' : 'null')
  
  if (!token) {
    throw new Error('Not authenticated with Spotify')
  }

  console.log('Calling Spotify API for top tracks...')
  const data = await fetchSpotifyApi('/me/top/tracks?time_range=medium_term&limit=10', token)
  console.log('=== Spotify API Response for Top Tracks ===')
  console.log('Full response:', JSON.stringify(data, null, 2))
  console.log('Items count:', data.items?.length)

  return data.items?.map((track: any) => ({
    id: track.id,
    source: 'spotify' as MusicSource,
    title: track.name,
    artist: track.artists.map((a: any) => a.name).join(', '),
    album: track.album.name,
    albumArt: track.album.images?.[0]?.url || '',
    duration: track.duration_ms / 1000,
    previewUrl: track.preview_url,
    trackNumber: 0,
    externalId: track.id,
  })) || []
}

function normalizeGenres(genres: string[]): string[] {
  const genreMapping: Record<string, string[]> = {
    'pop': ['Pop'],
    'rock': ['Rock'],
    'hip-hop': ['Hip-Hop'],
    'hip hop': ['Hip-Hop'],
    'r-n-b': ['R&B'],
    'r&b': ['R&B'],
    'electronic': ['Electronic', 'Dance'],
    'edm': ['Electronic', 'Dance'],
    'jazz': ['Jazz'],
    'classical': ['Classical'],
    'country': ['Country'],
    'indie': ['Indie'],
    'metal': ['Metal'],
    'heavy metal': ['Heavy Metal'],
    'hard rock': ['Hard Rock'],
    'thrash metal': ['Thrash Metal'],
    'progressive metal': ['Progressive Metal'],
    'alternative metal': ['Alternative Metal'],
    'glam metal': ['Glam Metal'],
    'speed metal': ['Speed Metal'],
    'folk': ['Folk'],
    'blues': ['Blues'],
    'blues rock': ['Blues Rock'],
    'classic rock': ['Classic Rock'],
    'alternative rock': ['Alternative Rock'],
    'progressive rock': ['Progressive Rock'],
    'psychedelic rock': ['Psychedelic Rock'],
    'grunge': ['Grunge'],
    'post-grunge': ['Post-Grunge'],
    'reggae': ['Reggae'],
    'latin': ['Latin'],
    'world': ['World'],
    'alternative': ['Alternative'],
    'soul': ['Soul'],
    'punk': ['Punk'],
    'lo-fi': ['Lo-Fi'],
    'lofi': ['Lo-Fi'],
    'ambient': ['Electronic'],
    'house': ['Electronic', 'Dance'],
    'techno': ['Electronic', 'Dance'],
    'trap': ['Hip-Hop'],
    'trap latino': ['Latin Trap'],
    'drill': ['Hip-Hop'],
    'rap': ['Hip-Hop'],
    'dance': ['Dance'],
    'disco': ['Disco'],
    'funk': ['Funk'],
    'psychedelic': ['Alternative'],
    'experimental': ['Alternative'],
    'synth-pop': ['Synth Pop'],
    'dance-pop': ['Dance Pop'],
    'contemporary r&b': ['Contemporary R&B'],
    'alternative r&b': ['Alternative R&B'],
    'pop rap': ['Pop Rap'],
    'british': ['British'],
    'american': ['American'],
    'french': ['French'],
    'french house': ['French House'],
    'nwobhm': ['NWOBHM'],
    'new wave of british heavy metal': ['NWOBHM'],
    'traditional doom metal': ['Doom Metal'],
    'proto doom': ['Doom Metal'],
    'southern rock': ['Southern Rock'],
    'groove metal': ['Groove Metal'],
    'acoustic rock': ['Acoustic Rock'],
    'art rock': ['Art Rock'],
    'space rock': ['Space Rock'],
    'noise rock': ['Noise Rock'],
  }

  const normalized = new Set<string>()

  genres.forEach(genre => {
    const lower = genre.toLowerCase()
    const mapped = genreMapping[lower]
    if (mapped) {
      mapped.forEach(g => normalized.add(g))
    } else {
      normalized.add(genre.charAt(0).toUpperCase() + genre.slice(1))
    }
  })

  return Array.from(normalized).slice(0, 20)
}
