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

interface SpotifyFullArtist {
  id: string
  name: string
  images: SpotifyImage[]
}

interface SpotifyArtistSearchResponse {
  artists: { items: SpotifyFullArtist[] }
}

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

function appendStructuredModifiers(parts: string[], params: URLSearchParams): void {
  // artist filter is handled via direct artist lookup, not keyword modifier
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
}

function buildSpotifyTrackQuery(params: URLSearchParams): string {
  const parts: string[] = []
  const q = params.get('q')

  if (q?.trim()) {
    // When user typed a specific query, use it as-is without genre/tag pollution
    parts.push(q.trim())
  } else {
    // Discovery mode: genres and tags form the query
    parseMultiValue(params, 'genre').forEach(g => parts.push(g))
    parseMultiValue(params, 'tag').forEach(t => parts.push(t))
  }

  appendStructuredModifiers(parts, params)
  return parts.join(' ')
}

function buildSpotifyArtistTrackQuery(params: URLSearchParams): string {
  const q = params.get('q')?.trim()
  if (!q) return ''

  const parts: string[] = [`artist:${q}`]
  appendStructuredModifiers(parts, params)
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

// ── Spotify artist lookup ──

async function findArtistTracks(
  artistName: string,
  token: string,
  limit: number
): Promise<SpotifyTrack[]> {
  // Step 1: Find the exact artist — use quoted search to find niche artists
  console.log(`[artist-lookup] Searching for artist: "${artistName}"`)
  const quotedQuery = encodeURIComponent(`"${artistName}"`)
  const artistRes = await fetch(
    `https://api.spotify.com/v1/search?type=artist&q=${quotedQuery}&limit=10`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  if (!artistRes.ok) {
    console.error(`[artist-lookup] Artist search failed: ${artistRes.status}`)
    return []
  }

  const artistData: SpotifyArtistSearchResponse = await artistRes.json()
  const artists = artistData.artists.items
  console.log(`[artist-lookup] Found ${artists.length} artists:`, artists.map(a => `${a.name} (${a.id})`))

  // Find all exact name matches (there can be multiple artists with the same name)
  const exactMatches = artists.filter(
    a => a.name.toLowerCase() === artistName.toLowerCase()
  )
  const matchesToUse = exactMatches.length > 0 ? exactMatches : artists.slice(0, 1)

  if (matchesToUse.length === 0) {
    console.log(`[artist-lookup] No artist match found for "${artistName}"`)
    return []
  }
  console.log(`[artist-lookup] Using ${matchesToUse.length} artist(s):`, matchesToUse.map(a => `${a.name} (${a.id})`))

  // Step 2: Get albums for each matched artist and fetch their tracks
  const allTracks: SpotifyTrack[] = []

  for (const match of matchesToUse) {
    // Get artist's albums
    const albumsRes = await fetch(
      `https://api.spotify.com/v1/artists/${match.id}/albums?include_groups=album%2Csingle&limit=20`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!albumsRes.ok) {
      console.log(`[artist-lookup] Albums fetch failed for ${match.name}: ${albumsRes.status}`)
      continue
    }

    const albumsData: { items: { id: string; name: string }[] } = await albumsRes.json()
    console.log(`[artist-lookup] ${match.name}: ${albumsData.items.length} albums/singles`)

    if (albumsData.items.length === 0) continue

    // Get track IDs from albums (up to 5 albums)
    const albumTrackResults = await Promise.allSettled(
      albumsData.items.slice(0, 5).map(async (album) => {
        const res = await fetch(
          `https://api.spotify.com/v1/albums/${album.id}/tracks?limit=50`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (!res.ok) return []
        const data: { items: { id: string }[] } = await res.json()
        return data.items.map(t => t.id)
      })
    )

    const trackIds: string[] = []
    for (const result of albumTrackResults) {
      if (result.status === 'fulfilled') trackIds.push(...result.value)
    }

    // Fetch full track objects (need album art, popularity, etc.)
    if (trackIds.length > 0) {
      const batch = trackIds.slice(0, 50)
      const fullRes = await fetch(
        `https://api.spotify.com/v1/tracks?ids=${batch.join(',')}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (fullRes.ok) {
        const fullData: { tracks: SpotifyTrack[] } = await fullRes.json()
        allTracks.push(...fullData.tracks.filter(Boolean))
      }
    }
  }

  // Step 3: Also do a keyword search as extra coverage
  const searchQuery = encodeURIComponent(`artist:"${artistName}"`)
  const limitsToTry = [limit, 10, 5]
  for (const tryLimit of limitsToTry) {
    const searchRes = await fetch(
      `https://api.spotify.com/v1/search?type=track&q=${searchQuery}&limit=${tryLimit}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (searchRes.ok) {
      const searchData: SpotifySearchResponse = await searchRes.json()
      allTracks.push(...searchData.tracks.items)
      break
    }
  }

  // Dedup by ID
  const seen = new Set<string>()
  const merged: SpotifyTrack[] = []
  for (const t of allTracks) {
    if (!seen.has(t.id)) {
      seen.add(t.id)
      merged.push(t)
    }
  }

  console.log(`[artist-lookup] Final: ${merged.length} tracks`)
  return merged.slice(0, limit)
}

// ── Spotify search ──

function mapSpotifyTrack(track: SpotifyTrack): Track {
  return {
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
  }
}

async function searchSpotify(params: URLSearchParams): Promise<Track[]> {
  const trackQuery = buildSpotifyTrackQuery(params)
  const artistQuery = buildSpotifyArtistTrackQuery(params)
  const artistFilters = parseMultiValue(params, 'artist')

  if (!trackQuery && !artistQuery && artistFilters.length === 0) return []

  const token = await getClientCredentialsToken()
  const limitParam = params.get('limit')
  const limit = Math.min(Math.max(parseInt(limitParam || '20') || 20, 1), 50)

  const fetchTracks = async (query: string): Promise<SpotifyTrack[]> => {
    const res = await fetch(
      `https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(query)}&limit=${limit}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    if (!res.ok) throw new Error(`Spotify search failed: ${res.status}`)
    const data: SpotifySearchResponse = await res.json()
    return data.tracks.items
  }

  // When artist filter is set, use direct artist lookup for accurate results
  if (artistFilters.length > 0) {
    const artistResults = await Promise.allSettled(
      artistFilters.map(name => findArtistTracks(name, token, limit))
    )

    const artistTracks: SpotifyTrack[] = []
    for (const result of artistResults) {
      if (result.status === 'fulfilled') {
        artistTracks.push(...result.value)
      }
    }

    // Also run the regular track query in parallel if there's a q param
    const q = params.get('q')?.trim()
    if (q) {
      try {
        const searchTracks = await fetchTracks(q)
        artistTracks.push(...searchTracks)
      } catch { /* artist lookup results are sufficient */ }
    }

    // Dedup and apply limit
    const seen = new Set<string>()
    const merged: Track[] = []
    for (const item of artistTracks) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        merged.push(mapSpotifyTrack(item))
      }
    }
    return merged.slice(0, limit)
  }

  // No artist filter — use query-based search
  // Discovery mode (no q): single search
  if (!artistQuery) {
    const items = await fetchTracks(trackQuery)
    return items.map(mapSpotifyTrack)
  }

  // Two-pronged search: track query + artist-aware query in parallel
  const [trackResult, artistResult] = await Promise.allSettled([
    trackQuery ? fetchTracks(trackQuery) : Promise.resolve([]),
    fetchTracks(artistQuery),
  ])

  const trackItems = trackResult.status === 'fulfilled' ? trackResult.value : []
  const artistItems = artistResult.status === 'fulfilled' ? artistResult.value : []

  // Merge: track results first, then unique artist results
  const seen = new Set<string>()
  const merged: Track[] = []

  for (const item of trackItems) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      merged.push(mapSpotifyTrack(item))
    }
  }
  for (const item of artistItems) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      merged.push(mapSpotifyTrack(item))
    }
  }

  return merged.slice(0, limit)
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
  const hasArtistFilter = parseMultiValue(params, 'artist').length > 0
  const hasQuery = buildSpotifyTrackQuery(params).length > 0 || buildSpotifyArtistTrackQuery(params).length > 0 || hasArtistFilter

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
