export type MusicSource = 'spotify' | 'apple' | 'youtube' | 'local'

export interface Profile {
  id: string
  username: string | null
  avatar_url: string | null
  city: string
  top_genres: string[]
  created_at: string
}

export interface City {
  id: string
  name: string
  state: string | null
  country: string
  slug: string
  is_active: boolean
  created_at: string
}

export interface Genre {
  id: string
  name: string
  slug: string
  image_url: string | null
}

export interface Event {
  id: string
  title: string
  description: string | null
  organizer_id: string | null
  city_id: string | null
  venue: string
  address: string | null
  date: string | null
  time: string | null
  is_recurring: boolean
  recurring_pattern: string | null
  genre_id: string | null
  cover_image: string | null
  max_attendees: number | null
  created_at: string
  city?: City
  genre?: Genre
  organizer?: Profile
  attendee_count?: number
}

export interface EventAttendee {
  event_id: string
  user_id: string
  rsvp_status: 'going' | 'maybe' | 'not_going'
  joined_at: string
  profile?: Profile
}

export interface ConnectedService {
  id: string
  user_id: string
  provider: MusicSource
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
}

export interface Track {
  id: string
  source: MusicSource
  title: string
  artist: string
  album: string
  albumArt: string
  duration: number
  previewUrl: string | null
  trackNumber: number
  externalId: string
}

export interface Album {
  id: string
  source: MusicSource
  external_id: string | null
  title: string
  artist: string
  artwork_url: string | null
  preview_url: string | null
  added_by: string | null
  created_at: string
}

export interface UserTopGenres {
  genres: string[]
  tracks: Track[]
}
