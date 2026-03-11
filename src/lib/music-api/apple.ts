import type { Album, Track } from '../types'
import type { MusicProvider } from './types'

export const appleMusicProvider: MusicProvider = {
  source: 'apple',

  async searchAlbums(): Promise<Album[]> {
    throw new Error('Apple Music integration coming soon')
  },

  async getAlbumTracks(): Promise<Track[]> {
    throw new Error('Apple Music integration coming soon')
  },

  async getAlbum(): Promise<Album> {
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
