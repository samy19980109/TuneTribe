import type { Album, Track, MusicSource } from '../types'

export interface MusicProvider {
  source: MusicSource
  searchAlbums: (query: string) => Promise<Album[]>
  getAlbumTracks: (albumId: string) => Promise<Track[]>
  getAlbum: (albumId: string) => Promise<Album>
}

export interface UnifiedSearchResult {
  albums: Album[]
  source: MusicSource
}
