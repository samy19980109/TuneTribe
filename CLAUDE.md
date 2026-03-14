# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server on port 3000
npm run build        # Production build
npm run lint         # ESLint (flat config, next/core-web-vitals + next/typescript)
npm run lint -- --fix  # Auto-fix lint issues
npx tsc --noEmit     # Type-check only
```

No test framework is configured yet. When added, use Vitest for unit tests and Playwright for E2E.

## Architecture

**Next.js 16 App Router** with React 19, TypeScript strict mode, Tailwind CSS 4, Supabase (auth + database), and Zustand for client state.

### Auth Flow

- Supabase Auth with OAuth (Spotify, Google) and email/password
- Two callback paths: `/auth/callback` (Supabase OAuth) and `/callback` (Spotify token exchange via route handler)
- `/callback/success` — post-Spotify-connect landing page
- Client-side auth state lives in `useAuthStore` (Zustand) which holds `User` + `Profile`
- Browser Supabase client: `createClient()` from `@/lib/supabase/client` (uses `createBrowserClient` from `@supabase/ssr`)
- Server Supabase client: `await createClient()` from `@/lib/supabase/server` (async, uses cookies)

### Music API Layer

`src/lib/music-api/` provides a unified interface across Spotify, Apple Music, and YouTube:
- `index.ts` — unified exports (`searchAlbums`, `getAlbumTracks`, `getAlbum`)
- `spotify-auth.ts` — Spotify OAuth token utilities
- Each provider (`apple.ts`, `youtube.ts`) implements the same shape
- Types in `music-api/types.ts`; core domain types in `lib/types.ts`

### State Management

Two Zustand stores in `src/stores/`:
- `useAuthStore` — user session + profile, `fetchUser()`, `signOut()`
- `usePlayerStore` — music player state, preview playback

### Database

Supabase Postgres. Schema in `supabase/schema.sql`. Key tables: `profiles`, `cities`, `genres`, `events`, `event_attendees`, `connected_services`. Events reference cities and genres via FK; attendees track RSVP status (`going`/`maybe`/`not_going`).

## Code Conventions

- **Imports**: use `@/` path alias. Group: external → internal → types. Use `import type` for type-only imports.
- **Components**: PascalCase files, default exports, `'use client'` when using hooks/browser APIs.
- **Stores**: `useXxxStore` naming convention.
- **TypeScript**: strict — no `any`, use `null` (not `undefined`) for nullable DB fields, interfaces for objects, types for unions.
- **Tailwind**: v4 (no tailwind.config.ts). Spotify green: `bg-[#1DB954]` / `hover:bg-[#1ed760]`.
- **DB queries**: use `.maybeSingle()` for optional rows, always null-coalesce results (`data || []`).
- **API routes**: try/catch with `console.error` + proper status codes.

## Environment Variables

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `NEXT_PUBLIC_APP_URL`. Optional: `YOUTUBE_API_KEY`, `APPLE_MUSIC_KEY_ID`, `APPLE_MUSIC_TEAM_ID`, `APPLE_MUSIC_PRIVATE_KEY`.
