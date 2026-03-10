import type { Album, Track, MusicSource } from '../types'
import type { MusicProvider, UnifiedSearchResult } from './types'
import { spotifyProvider } from './spotify'
import { appleMusicProvider } from './apple'
import { youtubeMusicProvider } from './youtube'

const providers: Record<MusicSource, MusicProvider> = {
  spotify: spotifyProvider,
  apple: appleMusicProvider,
  youtube: youtubeMusicProvider,
  local: {
    source: 'local',
    searchAlbums: async () => [],
    getAlbumTracks: async () => [],
    getAlbum: async () => { throw new Error('Local albums handled differently') },
  },
}

export async function searchAlbums(
  query: string,
  sources: MusicSource[] = ['spotify']
): Promise<UnifiedSearchResult[]> {
  const results = await Promise.all(
    sources.map(async (source) => {
      try {
        const albums = await providers[source].searchAlbums(query)
        return { albums, source }
      } catch (error) {
        console.error(`Error searching ${source}:`, error)
        return { albums: [], source }
      }
    })
  )

  return results
}

export async function getAlbumTracks(
  albumId: string,
  source: MusicSource
): Promise<Track[]> {
  return providers[source].getAlbumTracks(albumId)
}

export async function getAlbum(
  albumId: string,
  source: MusicSource
): Promise<Album> {
  return providers[source].getAlbum(albumId)
}

export function getProvider(source: MusicSource): MusicProvider {
  return providers[source]
}

export function getAvailableProviders(): MusicSource[] {
  return ['spotify', 'apple', 'youtube', 'local']
}

export { providers }
export { getTopGenres, getTopTracks } from './spotify'
