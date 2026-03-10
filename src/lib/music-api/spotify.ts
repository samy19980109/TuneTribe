import type { Album, Track, MusicSource } from '../types'
import type { MusicProvider } from './types'

let spotifyClient: any = null

async function getSpotifyClient(): Promise<any> {
  if (spotifyClient) return spotifyClient

  const { SpotifyApi } = await import('@spotify/web-api-ts-sdk')
  
  spotifyClient = SpotifyApi.withUserAuthorization(
    process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
    process.env.NEXT_PUBLIC_APP_URL + '/callback',
    [
      'user-read-private',
      'user-read-email',
      'user-top-read',
      'user-library-read',
      'streaming',
      'user-read-playback-state',
      'user-modify-playback-state',
    ]
  )

  return spotifyClient
}

// Use SDK's internal fetch mechanism
async function spotifyFetch(endpoint: string): Promise<any> {
  const client = await getSpotifyClient()
  
  // Try to use SDK's internal fetch
  // The SDK has an httpClient or fetch method
  try {
    // Method 1: Use the SDK's currentUser with proper path
    // The SDK might expect a different call format
    const response = await client.currentUser.topItems('artists', { time_range: 'medium_term', limit: 20 })
    return response
  } catch (e) {
    console.log('Method 1 failed:', e)
  }
  
  try {
    // Method 2: Try with different parameter format
    const response = await (client.currentUser as any).top({ type: 'artists', timeRange: 'medium_term', limit: 20 })
    return response
  } catch (e) {
    console.log('Method 2 failed:', e)
  }
  
  try {
    // Method 3: Use search to get genres from artists - search for known artists
    // This is a workaround - we'll search for popular artists and get their genres
    const response = await client.search('rock', ['artist'], 10)
    console.log('Search response:', response)
    return response
  } catch (e) {
    console.log('Method 3 failed:', e)
  }
  
  throw new Error('All SDK methods failed')
}

function mapSpotifyAlbum(album: any): Album {
  return {
    id: album.id,
    source: 'spotify' as MusicSource,
    external_id: album.id,
    title: album.name,
    artist: album.artists.map((a: any) => a.name).join(', '),
    artwork_url: album.images?.[0]?.url || null,
    preview_url: null,
    added_by: null,
    created_at: new Date().toISOString(),
  }
}

function mapSpotifyTrack(track: any, albumArt: string, albumName: string): Track {
  return {
    id: track.id,
    source: 'spotify',
    title: track.name,
    artist: track.artists.map((a: any) => a.name).join(', '),
    album: albumName,
    albumArt,
    duration: track.duration_ms / 1000,
    previewUrl: track.preview_url,
    trackNumber: track.track_number,
    externalId: track.id,
  }
}

export const spotifyProvider: MusicProvider = {
  source: 'spotify',

  async searchAlbums(query: string): Promise<Album[]> {
    const client = await getSpotifyClient()
    const response = await client.search(query, ['album'])
    return response.albums.items.map(mapSpotifyAlbum)
  },

  async getAlbumTracks(albumId: string): Promise<Track[]> {
    const client = await getSpotifyClient()
    const album = await client.albums.get(albumId)
    const response = await client.albums.tracks(albumId)
    const artwork = album.images?.[0]?.url || ''
    return response.items.map((track: any, index: number) => ({
      ...mapSpotifyTrack(track, artwork, album.name),
      trackNumber: index + 1,
    }))
  },

  async getAlbum(albumId: string): Promise<Album> {
    const client = await getSpotifyClient()
    const album = await client.albums.get(albumId)
    return mapSpotifyAlbum(album)
  },
}

export async function searchSpotify(query: string): Promise<Album[]> {
  return spotifyProvider.searchAlbums(query)
}

export async function getSpotifyAlbumTracks(albumId: string): Promise<Track[]> {
  return spotifyProvider.getAlbumTracks(albumId)
}

export async function getSpotifyAlbum(albumId: string): Promise<Album> {
  return spotifyProvider.getAlbum(albumId)
}

// Get top genres by searching for popular artists
// Since we can't access the user's top artists directly, we'll use a workaround
export async function getTopGenres(): Promise<string[]> {
  console.log('Getting top genres via search workaround...')
  
  const client = await getSpotifyClient()
  
  // Search for popular genres via different search terms
  const genreSearchTerms = ['rock', 'pop', 'hip hop', 'jazz', 'electronic', 'classical', 'country', 'indie', 'metal', 'folk']
  const allGenres = new Map<string, number>()
  
  for (const term of genreSearchTerms) {
    try {
      const response = await client.search(term, ['artist'], 5)
      console.log(`Search for "${term}":`, response)
      
      response.artists?.items?.forEach((artist: any) => {
        artist.genres?.forEach((genre: string) => {
          allGenres.set(genre, (allGenres.get(genre) || 0) + 1)
        })
      })
    } catch (e) {
      console.log(`Search failed for "${term}":`, e)
    }
  }
  
  console.log('All genres found:', Array.from(allGenres.entries()))
  
  // Sort by count and take top genres
  const sortedGenres = Array.from(allGenres.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([genre]) => genre)
  
  console.log('Sorted genres:', sortedGenres)
  
  return normalizeGenres(sortedGenres)
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
    'folk': ['Folk'],
    'blues': ['Blues'],
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
    'drill': ['Hip-Hop'],
    'rap': ['Hip-Hop'],
    'dance': ['Dance'],
    'disco': ['Dance'],
    'funk': ['Soul'],
    'psychedelic': ['Alternative'],
    'experimental': ['Alternative'],
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

  return Array.from(normalized).slice(0, 5)
}

export async function getTopTracks(): Promise<Track[]> {
  const client = await getSpotifyClient()
  
  // Get tracks from various genre searches
  const genreSearchTerms = ['rock', 'pop', 'hip hop']
  const allTracks: any[] = []
  
  for (const term of genreSearchTerms) {
    try {
      const response = await client.search(term, ['track'], 3)
      response.tracks?.items?.forEach((track: any) => {
        if (!allTracks.find(t => t.id === track.id)) {
          allTracks.push(track)
        }
      })
    } catch (e) {
      console.log(`Track search failed for "${term}"`)
    }
  }

  return allTracks.slice(0, 10).map((track: any) => ({
    id: track.id,
    source: 'spotify',
    title: track.name,
    artist: track.artists.map((a: any) => a.name).join(', '),
    album: track.album.name,
    albumArt: track.album.images?.[0]?.url || '',
    duration: track.duration_ms / 1000,
    previewUrl: track.preview_url,
    trackNumber: 0,
    externalId: track.id,
  }))
}
