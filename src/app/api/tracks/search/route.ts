import { NextRequest, NextResponse } from 'next/server'
import type { Track, MusicSource } from '@/lib/types'

// ── Spotify types ──

interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface SpotifyArtist { name: string }
interface SpotifyImage { url: string }
interface SpotifyAlbum { name: string; images: SpotifyImage[]; release_date: string }

interface SpotifyTrack {
  id: string
  name: string
  artists: SpotifyArtist[]
  album: SpotifyAlbum
  duration_ms: number
  preview_url: string | null
  popularity: number
}

interface SpotifySearchResponse {
  tracks: { items: SpotifyTrack[] }
}

// ── MusicBrainz types ──

interface MBArtistCredit {
  name: string
  artist: { id: string; name: string }
}

interface MBRelease {
  id: string
  title: string
  date?: string
}

interface MBRecording {
  id: string
  title: string
  length?: number
  'artist-credit': MBArtistCredit[]
  releases?: MBRelease[]
  tags?: { name: string; count: number }[]
}

interface MBSearchResponse {
  recordings: MBRecording[]
  count: number
}

// ── Spotify token cache ──

let cachedToken: { token: string; expiresAt: number } | null = null

async function getClientCredentialsToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token
  }

  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('Spotify credentials not configured')
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    throw new Error('Failed to get Spotify client credentials token')
  }

  const data: SpotifyTokenResponse = await res.json()
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }

  return data.access_token
}

// ── Query builders ──

function parseMultiValue(params: URLSearchParams, key: string): string[] {
  const val = params.get(key)
  if (!val?.trim()) return []
  return val.split(',').map(v => v.trim()).filter(Boolean)
}

function buildSpotifyQuery(params: URLSearchParams): string {
  // Spotify search only supports: artist:, album:, track:, year:, isrc:, upc:
  // genre: and tag: are NOT valid — pass genres as plain text keywords
  const parts: string[] = []

  const q = params.get('q')
  if (q?.trim()) parts.push(q.trim())

  // Genres as plain text (Spotify doesn't support genre: modifier in search)
  parseMultiValue(params, 'genre').forEach(g => parts.push(g))

  parseMultiValue(params, 'artist').forEach(a => parts.push(`artist:${a}`))

  const album = params.get('album')
  if (album?.trim()) parts.push(`album:${album.trim()}`)

  const yearFrom = params.get('yearFrom')
  const yearTo = params.get('yearTo')
  if (yearFrom && yearTo) {
    parts.push(`year:${yearFrom}-${yearTo}`)
  } else if (yearFrom) {
    parts.push(`year:${yearFrom}`)
  } else if (yearTo) {
    parts.push(`year:${yearTo}`)
  }

  // Tags as plain text (Spotify doesn't support tag: modifier)
  parseMultiValue(params, 'tag').forEach(t => parts.push(t))

  return parts.join(' ')
}

function buildMusicBrainzQuery(params: URLSearchParams): string {
  const parts: string[] = []

  const q = params.get('q')
  if (q?.trim()) parts.push(q.trim())

  parseMultiValue(params, 'genre').forEach(g => parts.push(`tag:${g}`))
  parseMultiValue(params, 'artist').forEach(a => parts.push(`artist:${a}`))

  const album = params.get('album')
  if (album?.trim()) parts.push(`release:${album.trim()}`)

  const yearFrom = params.get('yearFrom')
  const yearTo = params.get('yearTo')
  if (yearFrom && yearTo) {
    parts.push(`date:[${yearFrom} TO ${yearTo}]`)
  } else if (yearFrom) {
    parts.push(`date:[${yearFrom} TO *]`)
  } else if (yearTo) {
    parts.push(`date:[* TO ${yearTo}]`)
  }

  // MusicBrainz doesn't support Spotify-style tags, so skip tag param

  return parts.join(' AND ')
}

// ── Spotify search ──

async function searchSpotify(params: URLSearchParams): Promise<Track[]> {
  const query = buildSpotifyQuery(params)
  if (!query) return []

  const token = await getClientCredentialsToken()
  const limitParam = params.get('limit')
  const limit = Math.min(Math.max(parseInt(limitParam || '20') || 20, 1), 50)

  const res = await fetch(
    `https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(query)}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${token}` } }
  )

  if (!res.ok) {
    throw new Error(`Spotify search failed: ${res.status}`)
  }

  const data: SpotifySearchResponse = await res.json()

  return data.tracks.items.map((track) => ({
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
    popularity: track.popularity,
    releaseDate: track.album.release_date,
  }))
}

// ── MusicBrainz search (fallback) ──

async function searchMusicBrainz(params: URLSearchParams): Promise<Track[]> {
  const query = buildMusicBrainzQuery(params)
  if (!query) return []

  const limitParam = params.get('limit')
  const limit = Math.min(Math.max(parseInt(limitParam || '20') || 20, 1), 100)

  const res = await fetch(
    `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}`,
    {
      headers: {
        'User-Agent': 'TuneTribe/1.0 (https://tunetribe.app)',
        Accept: 'application/json',
      },
    }
  )

  if (!res.ok) {
    throw new Error(`MusicBrainz search failed: ${res.status}`)
  }

  const data: MBSearchResponse = await res.json()

  return data.recordings.map((rec) => {
    const artists = rec['artist-credit']?.map(ac => ac.name).join(', ') || 'Unknown Artist'
    const firstRelease = rec.releases?.[0]
    const releaseId = firstRelease?.id
    const albumArt = releaseId
      ? `https://coverartarchive.org/release/${releaseId}/front-250`
      : ''

    return {
      id: rec.id,
      source: 'spotify' as MusicSource, // still use 'spotify' source type for compatibility
      title: rec.title,
      artist: artists,
      album: firstRelease?.title || '',
      albumArt,
      duration: rec.length ? rec.length / 1000 : 0,
      previewUrl: null,
      trackNumber: 0,
      externalId: rec.id,
      popularity: rec.tags?.reduce((sum, t) => sum + t.count, 0) || 0,
      releaseDate: firstRelease?.date || '',
    }
  })
}

// ── Route handler ──

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const sort = params.get('sort')

  // Check if any filter is set
  const hasQuery = buildSpotifyQuery(params).length > 0

  if (!hasQuery) {
    return NextResponse.json({ tracks: [] })
  }

  let tracks: Track[] = []
  let usedSource: 'spotify' | 'musicbrainz' = 'spotify'

  // Try Spotify first
  try {
    tracks = await searchSpotify(params)
  } catch (error) {
    console.error('Spotify search error:', error)
  }

  // Fall back to MusicBrainz if Spotify returned nothing or failed
  if (tracks.length === 0) {
    try {
      tracks = await searchMusicBrainz(params)
      usedSource = 'musicbrainz'
    } catch (error) {
      console.error('MusicBrainz search error:', error)
    }
  }

  // Sort by popularity if requested
  if (sort === 'popularity_desc') {
    tracks.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
  } else if (sort === 'popularity_asc') {
    tracks.sort((a, b) => (a.popularity ?? 0) - (b.popularity ?? 0))
  }

  return NextResponse.json({ tracks, source: usedSource })
}
