import type { Album, Track, MusicSource, Genre } from '../types'

export interface MusicProvider {
  source: MusicSource
  searchAlbums: (query: string) => Promise<Album[]>
  getAlbumTracks: (albumId: string) => Promise<Track[]>
  getAlbum: (albumId: string) => Promise<Album>
}

export type MusicProviderType = 'spotify' | 'apple' | 'youtube' | 'local'

export interface UnifiedSearchResult {
  albums: Album[]
  source: MusicSource
}
