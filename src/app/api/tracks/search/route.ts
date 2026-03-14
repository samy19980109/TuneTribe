import { NextRequest, NextResponse } from 'next/server'
import type { Track, MusicSource } from '@/lib/types'

interface SpotifyTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

interface SpotifyArtist {
  name: string
}

interface SpotifyImage {
  url: string
}

interface SpotifyAlbum {
  name: string
  images: SpotifyImage[]
}

interface SpotifyTrack {
  id: string
  name: string
  artists: SpotifyArtist[]
  album: SpotifyAlbum
  duration_ms: number
  preview_url: string | null
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[]
  }
}

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

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')

  if (!query || query.trim().length === 0) {
    return NextResponse.json({ tracks: [] })
  }

  try {
    const token = await getClientCredentialsToken()

    const res = await fetch(
      `https://api.spotify.com/v1/search?type=track&q=${encodeURIComponent(query)}&limit=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!res.ok) {
      throw new Error(`Spotify search failed: ${res.status}`)
    }

    const data: SpotifySearchResponse = await res.json()

    const tracks: Track[] = data.tracks.items.map((track) => ({
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

    return NextResponse.json({ tracks })
  } catch (error) {
    console.error('Track search error:', error)
    return NextResponse.json({ tracks: [], error: 'Search failed' }, { status: 500 })
  }
}
