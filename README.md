# 🎵 TuneTribe

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-orange?style=for-the-badge)](LICENSE)

*A city-based music listening event platform that brings people together through shared musical experiences.*

**[Live Demo](https://tunetribe.app)** · **[Report Bug](https://github.com/samarthagarwal/tunetribe/issues)** · **[Request Feature](https://github.com/samarthagarwal/tunetribe/issues)**

</div>

---

## ✨ What is TuneTribe?

TuneTribe is where music lovers unite. Create and join listening events in your city, connect your favorite streaming services, and discover new music with fellow enthusiasts who share your taste.

> **Turn listening into an experience. Turn strangers into tribe.**

---

## 🚀 Features

<div align="center">

| Feature | Description |
|---------|-------------|
| 🏙️ **City-Based Events** | Find and create music listening events happening near you |
| 🎧 **Multi-Platform Sync** | Connect Spotify, Apple Music, or YouTube — your library, everywhere |
| 👤 **Personalized Profiles** | Showcase your music taste with top genres, artists, and custom avatars |
| 📅 **RSVP System** | Track event attendance with going/maybe/not_going status |
| 🔄 **Recurring Sessions** | Weekly or monthly listening sessions that never stop |
| 🎤 **Artist Discovery** | Explore artists and tracks from connected services |
| 🎫 **Event Management** | Create, manage, and host your own listening events |

</div>

---

## 🛠️ Tech Stack

<div align="center">

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16 (App Router) |
| **UI** | React 19 + Tailwind CSS 4 |
| **Language** | TypeScript (Strict Mode) |
| **Auth & Database** | Supabase |
| **State** | Zustand |
| **Music APIs** | Spotify · Apple Music · YouTube |

</div>

---

## 🏗️ Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   └── artist/[id]/          # Artist details endpoint
│   ├── auth/                     # Authentication pages
│   │   └── callback/             # OAuth callbacks
│   ├── events/                   # Event pages
│   │   ├── new/                  # Create new event
│   │   └── [id]/                 # Event detail page
│   ├── login/                    # Authentication page
│   ├── profile/                  # User profile & settings
│   ├── page.tsx                  # Home (event listing)
│   └── layout.tsx                # Root layout
├── components/                   # Reusable UI components
├── lib/
│   ├── music-api/                # Music service integrations
│   │   ├── spotify.ts            # Spotify API client
│   │   ├── apple.ts              # Apple Music API client
│   │   ├── youtube.ts            # YouTube Data API client
│   │   └── types.ts              # Music provider types
│   ├── supabase/                 # Supabase clients
│   │   ├── client.ts             # Browser client
│   │   └── server.ts             # Server-side client
│   └── types.ts                  # Core TypeScript types
└── stores/                       # Zustand state stores
    ├── useAuthStore.ts           # Authentication state
    └── usePlayerStore.ts         # Music player state
```

---

## 🏃‍♂️ Getting Started

### Prerequisites

- **Node.js** 18+
- **npm**, yarn, pnpm, or bun
- **Supabase** project (free tier works)
- **Spotify Developer** account ([dashboard](https://developer.spotify.com/dashboard))
- **YouTube Data API** key (optional)
- **Apple Music** API credentials (optional)

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/samarthagarwal/tunetribe.git
cd tunetribe

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env.local

# 4. Configure environment variables
# Edit .env.local with your credentials

# 5. Set up Supabase database
# Apply the schema from supabase/schema.sql to your Supabase project

# 6. Start the development server
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** — you're in.

---

### Environment Variables

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Spotify (required)
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3000/callback

# YouTube (optional)
YOUTUBE_API_KEY=your-youtube-api-key

# Apple Music (optional)
APPLE_MUSIC_KEY_ID=your-key-id
APPLE_MUSIC_TEAM_ID=your-team-id
APPLE_MUSIC_PRIVATE_KEY=your-private-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Need Spotify credentials?** Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard), create an app, and add `http://localhost:3000/callback` to Redirect URIs.

---

## 📚 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint -- --fix` | Auto-fix linting issues |
| `npx tsc --noEmit` | Type-check without emitting |

---

## 🗄️ Database Schema

| Table | Description |
|-------|-------------|
| `profiles` | User profiles with username, avatar, city, top genres, top artists & tracks |
| `cities` | Supported cities for events |
| `genres` | Music genres for event categorization |
| `events` | Listening events with venue, date, time, recurrence, and max attendees |
| `event_attendees` | RSVP tracking (going/maybe/not_going) |
| `connected_services` | OAuth tokens for Spotify, Apple Music, YouTube |

---

## 🤝 Contributing

Contributions are welcome! Feel free to open an issue or submit a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with 🎵 by music lovers, for music lovers.**

*[Back to top](#-tunetribe)*

</div>
