# TuneTribe - Agent Guidelines

This document provides comprehensive guidelines for agents working on the TuneTribe project.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Overview](#project-overview)
3. [Build, Lint, and Test Commands](#build-lint-and-test-commands)
4. [Environment Variables](#environment-variables)
5. [Tech Stack](#tech-stack)
6. [Project Structure](#project-structure)
7. [Database Schema](#database-schema)
8. [Core Types](#core-types)
9. [Code Style Guidelines](#code-style-guidelines)
10. [API Routes](#api-routes)
11. [Key Components & Patterns](#key-components--patterns)
12. [Testing](#testing)

---

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase and Spotify credentials

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

---

## Project Overview

TuneTribe is a platform for discovering and creating music listening events in your city. Users can:

- Browse listening events by city and genre
- Create new events with venue, date, time, and genre
- Connect Spotify/Apple Music/YouTube accounts for personalized recommendations
- RSVP to events
- View other users' music profiles

---

## Build, Lint, and Test Commands

```bash
# Development
npm run dev              # Start Next.js development server (port 3000)

# Build
npm run build            # Build for production
npm run start            # Start production server

# Linting
npm run lint             # Run ESLint on entire project
npm run lint -- --fix    # Auto-fix linting issues

# TypeScript
npx tsc --noEmit         # Type-check without emitting files
```

---

## Environment Variables

Create a `.env.local` file with the following variables:

```bash
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Spotify (required for music features)
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your-spotify-client-id
SPOTIFY_CLIENT_SECRET=your-spotify-client-secret

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

To get Spotify credentials:
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add `http://localhost:3000/auth/callback` to Redirect URIs

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) |
| UI Library | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS 4 |
| Auth & Database | Supabase |
| State Management | Zustand |
| Music APIs | Spotify Web API, Apple Music API, YouTube Data API |

---

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Home page (event listing)
│   ├── layout.tsx                # Root layout
│   ├── login/page.tsx            # Authentication page
│   ├── profile/page.tsx          # User profile & settings
│   ├── events/
│   │   ├── new/page.tsx          # Create new event
│   │   └── [id]/page.tsx         # Event detail page
│   ├── auth/
│   │   └── callback/page.tsx    # OAuth callback handler
│   ├── callback/
│   │   ├── route.ts              # Auth callback API route
│   │   └── success/page.tsx     # Post-auth success page
│   └── api/
│       └── artist/[id]/route.ts  # Artist API endpoint
│
├── components/                   # Reusable components (add here)
│
├── lib/
│   ├── types.ts                  # Core TypeScript types
│   ├── supabase/
│   │   ├── client.ts            # Browser Supabase client
│   │   └── server.ts            # Server-side Supabase client
│   └── music-api/
│       ├── index.ts              # Unified music API exports
│       ├── types.ts              # Music provider types
│       ├── spotify.ts            # Spotify integration
│       ├── apple.ts              # Apple Music integration
│       ├── youtube.ts            # YouTube Music integration
│       └── spotify-auth.ts       # Spotify OAuth utilities
│
└── stores/                      # Zustand state stores
    ├── useAuthStore.ts          # Authentication state
    └── usePlayerStore.ts        # Music player state
```

---

## Database Schema

### Tables

**profiles**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (FK to auth.users) |
| username | text | Display name |
| avatar_url | text | Profile picture URL |
| city | text | User's city |
| top_genres | text[] | User's top genres from Spotify |
| top_artists | jsonb | User's top artists |
| top_tracks | jsonb | User's top tracks |
| created_at | timestamp | Creation timestamp |

**cities**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | City name |
| state | text | State/region |
| country | text | Country |
| slug | text | URL-friendly slug |
| is_active | boolean | Whether city is active |

**genres**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Genre name |
| slug | text | URL-friendly slug |
| image_url | text | Genre image |

**events**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| title | text | Event title |
| description | text | Event description |
| organizer_id | uuid | FK to profiles |
| city_id | uuid | FK to cities |
| venue | text | Venue name |
| address | text | Full address |
| date | date | Event date |
| time | time | Event time |
| is_recurring | boolean | Whether event repeats |
| recurring_pattern | text | e.g., weekly, monthly |
| genre_id | uuid | FK to genres |
| cover_image | text | Event cover image URL |
| max_attendees | integer | Max attendees (null = unlimited) |
| created_at | timestamp | Creation timestamp |

**event_attendees**
| Column | Type | Description |
|--------|------|-------------|
| event_id | uuid | FK to events |
| user_id | uuid | FK to profiles |
| rsvp_status | text | going, maybe, not_going |
| joined_at | timestamp | When user RSVP'd |

**connected_services**
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to profiles |
| provider | text | spotify, apple, youtube |
| access_token | text | OAuth access token |
| refresh_token | text | OAuth refresh token |
| expires_at | timestamp | Token expiration |

---

## Core Types

All core types are defined in `src/lib/types.ts`:

```typescript
// Music source enum
type MusicSource = 'spotify' | 'apple' | 'youtube' | 'local'

// User profile
interface Profile {
  id: string
  username: string | null
  avatar_url: string | null
  city: string
  top_genres: string[]
  top_artists: TopArtist[]
  top_tracks: TopTrack[]
  created_at: string
}

// Event
interface Event {
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

// Track (from any music service)
interface Track {
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
```

Music provider types are in `src/lib/music-api/types.ts`.

---

## Code Style Guidelines

### Imports

Use path alias `@/` for internal imports. Group imports in order: external → internal → types.

```typescript
// Good
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Event, Genre } from '@/lib/types'
import { usePlayerStore } from '@/stores/usePlayerStore'

// Avoid
import { Event, Genre } from '@/lib/types'  // Use 'type' for types
import "../../../lib/utils"                  // Use @/ alias
```

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `ProfileMenu`, `EventCard` |
| Component files | PascalCase | `ProfileMenu.tsx` |
| Utility files | camelCase | `spotify-auth.ts` |
| Hooks | Prefix with `use` | `usePlayerStore`, `useAuthStore` |
| Zustand stores | `useXxxStore` | `usePlayerStore` |
| Types/Interfaces | PascalCase | `Event`, `UserTopGenres` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_ATTENDEES` |

### TypeScript

- Use strict typing - avoid `any`
- Use `unknown` if type is truly uncertain
- Use `null` for nullable database fields (not `undefined`)
- Use interfaces for object shapes, types for unions

```typescript
// Good
interface PlayerState {
  currentTrack: Track | null
  isPlaying: boolean
}

type MusicSource = 'spotify' | 'apple' | 'youtube' | 'local'

// Avoid
interface PlayerState {
  currentTrack: any
  isPlaying: any
}
```

### React Patterns

- Use `'use client'` for components using hooks or browser APIs
- Use functional components exclusively
- Handle loading/error states explicitly

```typescript
'use client'

import { useState, useEffect } from 'react'

export default function EventList() {
  const [events, setEvents] = useState<Event[]>([])
  
  // Early return for loading state
  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <LoginPrompt />
  }

  // Main logic here
}
```

### Error Handling

API routes should use try/catch with proper error logging:

```typescript
export async function GET(request: NextRequest) {
  try {
    const data = await fetchSomething()
    return NextResponse.json({ data })
  } catch (error) {
    console.error('Failed to fetch:', error)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}
```

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/artist/[id]` | GET | Fetch artist details |

---

## Key Components & Patterns

### Authentication

The app uses Supabase Auth with OAuth (Spotify, Google) and email/password.

**Client-side auth check:**
```typescript
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()
```

**Auth store (`src/stores/useAuthStore.ts`):**
```typescript
import { useAuthStore } from '@/stores/useAuthStore'

// In component
const { user, profile, fetchUser, signOut } = useAuthStore()
```

### Database Queries

```typescript
// Fetch events with relations
const { data } = await supabase
  .from('events')
  .select('*, city:cities(*), genre:genres(*), organizer:profiles(*)')
  .eq('city_id', cityId)
  .gte('date', today)
  .order('date', { ascending: true })

// Use .maybeSingle() for optional rows
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', userId)
  .maybeSingle()

// Always handle null
setEvents(data || [])
```

### Music API Integration

Music providers are unified through `src/lib/music-api/index.ts`:

```typescript
import { searchAlbums, getAlbumTracks, getAlbum } from '@/lib/music-api'

// Search across providers
const results = await searchAlbums('query', ['spotify', 'apple'])

// Get tracks from a specific provider
const tracks = await getAlbumTracks(albumId, 'spotify')
```

### Player State (Zustand)

```typescript
import { usePlayerStore } from '@/stores/usePlayerStore'

// In component
const { 
  currentTrack, 
  isPlaying, 
  progress, 
  playPreview, 
  stopPreview, 
  togglePlay 
} = usePlayerStore()
```

### Tailwind CSS

- Use Tailwind 4 syntax (no `tailwind.config.ts` needed)
- Use semantic colors: `bg-gray-900`, `text-white`
- Use Spotify green: `bg-[#1DB954]`, `hover:bg-[#1ed760]`
- Use `group` and `group-hover` for hover states
- Use `transition-colors` for color transitions

```tsx
<button className="bg-[#1DB954] hover:bg-[#1ed760] text-black px-4 py-2 rounded-lg transition-colors">
  Get Started
</button>

<Link href="/events" className="group hover:text-[#1DB954] transition-colors">
  <span className="group-hover:scale-105 transition-transform">View</span>
</Link>
```

---

## Testing

This project does not currently have a test framework set up. When adding tests:

- Use Vitest for unit tests
- Use Playwright for E2E tests
- Place tests in `__tests__` directories alongside source files
- Follow existing code patterns and conventions

---

## Common Tasks

### Creating a New Page

1. Create route folder in `src/app/`
2. Add `page.tsx` with the page component
3. Use `'use client'` if client-side logic is needed
4. Follow the naming and import conventions above

### Adding a New API Route

1. Create folder in `src/app/api/`
2. Add `route.ts` with handler functions
3. Use proper error handling with try/catch

### Adding a New Component

1. Create file in `src/components/`
2. Use PascalCase for filename
3. Export as default
4. Use `'use client'` if needed

### Modifying Database Schema

1. Update Supabase directly via Dashboard or migrations
2. Update types in `src/lib/types.ts`
3. Update any related queries in the codebase

---

## Troubleshooting

### "NEXT_PUBLIC_SUPABASE_URL is not set"
- Ensure `.env.local` exists with correct variables
- Restart dev server after adding env vars

### "Spotify OAuth failed"
- Verify Redirect URI in Spotify Dashboard matches `http://localhost:3000/auth/callback`
- Check that client ID and secret are correct in `.env.local`

### ESLint errors
- Run `npm run lint -- --fix` to auto-fix
- Check specific errors in terminal output
