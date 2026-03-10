# TuneTribe

A city-based music listening event platform that brings people together through shared musical experiences. Create and join listening events in your city, connect your favorite music streaming services, and discover new music with fellow music enthusiasts.

## Features

- **City-Based Events** - Find and create music listening events in your city
- **Multi-Platform Integration** - Connect your Spotify, Apple Music, or YouTube accounts
- **User Profiles** - Showcase your music taste with top genres and avatar
- **RSVP System** - Track event attendance with going/maybe/not_going status
- **Recurring Events** - Support for weekly and monthly recurring listening sessions

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS
- **Backend**: Supabase (Auth, Database)
- **Music APIs**: Spotify Web API, YouTube Data API, Apple Music API
- **State Management**: Zustand

## Getting Started

### Prerequisites

- Node.js 18+
- npm/yarn/pnpm/bun
- Supabase project
- Spotify Developer account (for API access)
- YouTube Data API key (optional)
- Apple Music API credentials (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd tunetribe
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Configure your `.env.local` with the following:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Spotify
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/callback

# YouTube (optional)
YOUTUBE_API_KEY=your_youtube_api_key

# Apple Music (optional)
APPLE_MUSIC_KEY_ID=your_apple_key_id
APPLE_MUSIC_TEAM_ID=your_apple_team_id
APPLE_MUSIC_PRIVATE_KEY=your_apple_private_key
```

5. Set up the database:
```bash
# Apply the schema to your Supabase project
# The schema is located at supabase/schema.sql
```

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── callback/          # OAuth callbacks
│   ├── events/            # Event pages
│   ├── login/             # Login page
│   ├── profile/          # User profile page
│   └── page.tsx          # Home page
├── lib/
│   ├── music-api/         # Music service integrations
│   ├── supabase/          # Supabase client/server
│   └── types.ts           # TypeScript types
└── stores/                # Zustand stores
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Database Schema

- **profiles** - User profiles with username, avatar, city, and top genres
- **cities** - Supported cities for events
- **genres** - Music genres for categorization
- **events** - Listening events with venue, date, time, and recurrence
- **event_attendees** - Event RSVPs and attendance tracking
- **connected_services** - OAuth tokens for connected music services

## License

MIT
