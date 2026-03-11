// src/lib/music-api/genres.ts

const GENRE_MAPPING: Record<string, string[]> = {
  'hip hop': ['Hip Hop'],
  'rap': ['Hip Hop'],
  'trap': ['Hip Hop'],
  'r&b': ['R&B'],
  'soul': ['R&B', 'Soul'],
  'funk': ['Funk'],
  'disco': ['Disco'],
  'pop': ['Pop'],
  'indie pop': ['Pop', 'Indie'],
  'synth-pop': ['Pop', 'Electronic'],
  'dance pop': ['Pop', 'Dance'],
  'rock': ['Rock'],
  'alternative rock': ['Rock', 'Alternative'],
  'indie rock': ['Rock', 'Indie'],
  'classic rock': ['Rock', 'Classic Rock'],
  'hard rock': ['Rock', 'Hard Rock'],
  'punk': ['Rock', 'Punk'],
  'punk rock': ['Rock', 'Punk'],
  'emo': ['Rock', 'Emo'],
  'metal': ['Metal'],
  'heavy metal': ['Metal'],
  'death metal': ['Metal'],
  'thrash metal': ['Metal'],
  'black metal': ['Metal'],
  'doom metal': ['Metal'],
  'nwobhm': ['Metal'],
  'electronic': ['Electronic'],
  'edm': ['Electronic', 'Dance'],
  'house': ['Electronic', 'House'],
  'deep house': ['Electronic', 'House'],
  'tech house': ['Electronic', 'House'],
  'techno': ['Electronic', 'Techno'],
  'trance': ['Electronic', 'Trance'],
  'drum and bass': ['Electronic', 'D&B'],
  'dubstep': ['Electronic', 'Dubstep'],
  'ambient': ['Electronic', 'Ambient'],
  'jazz': ['Jazz'],
  'blues': ['Blues'],
  'country': ['Country'],
  'folk': ['Folk'],
  'classical': ['Classical'],
  'latin': ['Latin'],
  'reggae': ['Reggae'],
  'reggaeton': ['Latin', 'Reggaeton'],
  'afrobeats': ['World', 'Afrobeats'],
  'k-pop': ['Pop', 'K-Pop'],
}

export function normalizeGenres(rawGenres: string[]): string[] {
  const normalized = new Set<string>()
  for (const genre of rawGenres) {
    const lower = genre.toLowerCase()
    const mapped = GENRE_MAPPING[lower]
    if (mapped) {
      mapped.forEach(g => normalized.add(g))
    } else {
      // Title-case unknown genres
      normalized.add(genre.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))
    }
  }
  return Array.from(normalized)
}
