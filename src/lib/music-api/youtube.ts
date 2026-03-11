import type { Album, Track } from '../types'
import type { MusicProvider } from './types'

export const youtubeMusicProvider: MusicProvider = {
  source: 'youtube',

  async searchAlbums(): Promise<Album[]> {
    throw new Error('YouTube Music integration coming soon')
  },

  async getAlbumTracks(): Promise<Track[]> {
    throw new Error('YouTube Music integration coming soon')
  },

  async getAlbum(): Promise<Album> {
    throw new Error('YouTube Music integration coming soon')
  },
}

export async function searchYouTubeMusic(query: string): Promise<Album[]> {
  return youtubeMusicProvider.searchAlbums(query)
}

export async function getYouTubeMusicAlbumTracks(albumId: string): Promise<Track[]> {
  return youtubeMusicProvider.getAlbumTracks(albumId)
}

export async function getYouTubeMusicAlbum(albumId: string): Promise<Album> {
  return youtubeMusicProvider.getAlbum(albumId)
}
