import type { Album, Track, MusicSource } from '../types'
import type { MusicProvider } from './types'

export const appleMusicProvider: MusicProvider = {
  source: 'apple',

  async searchAlbums(query: string): Promise<Album[]> {
    throw new Error('Apple Music integration coming soon')
  },

  async getAlbumTracks(albumId: string): Promise<Track[]> {
    throw new Error('Apple Music integration coming soon')
  },

  async getAlbum(albumId: string): Promise<Album> {
    throw new Error('Apple Music integration coming soon')
  },
}

export async function searchAppleMusic(query: string): Promise<Album[]> {
  return appleMusicProvider.searchAlbums(query)
}

export async function getAppleMusicAlbumTracks(albumId: string): Promise<Track[]> {
  return appleMusicProvider.getAlbumTracks(albumId)
}

export async function getAppleMusicAlbum(albumId: string): Promise<Album> {
  return appleMusicProvider.getAlbum(albumId)
}
