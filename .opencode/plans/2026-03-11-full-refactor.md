# TuneTribe Full Refactor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate structural duplication, fix correctness bugs, wire up the unused auth store, remove dead code, clean TypeScript types, and strip debug logging — all without changing user-visible behavior.

**Architecture:** Top-down approach — create shared infrastructure first (components, hooks, helpers), then refactor pages to consume it, then fix correctness bugs and clean up libraries. This ensures pages are refactored against stable shared code, not against each other.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Supabase, Zustand

---

## Pre-flight

Before starting, run these to capture the baseline:

```bash
npm run lint 2>&1 | tail -5
# Expected: 42 errors, 42 warnings

npx tsc --noEmit 2>&1 | tail -10
# Note any pre-existing type errors

npm run build
# Note if build passes or fails
```

---

## Task 1: Create `src/lib/music-api/genres.ts`

**Files:**
- Create: `src/lib/music-api/genres.ts`

The canonical `normalizeGenres` lives in `spotify-auth.ts` (40+ entry mapping, correct). The copy in `spotify.ts` (being deleted) had wrong mappings for funk→Soul and disco→Dance. Extract to a shared module.

**Step 1: Create the file**

```typescript
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
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no new errors.

**Step 3: Commit**

```bash
git add src/lib/music-api/genres.ts
git commit -m "refactor: extract canonical normalizeGenres to genres.ts"
```

---

## Task 2: Create `src/lib/supabase/profile.ts`

**Files:**
- Create: `src/lib/supabase/profile.ts`

This consolidates the get-or-create profile logic copy-pasted in `page.tsx:104–123`, `profile/page.tsx:43–65`, `auth/callback/page.tsx:22–35`, and `syncSpotifyData` in `profile/page.tsx:144–157`.

**Step 1: Create the file**

```typescript
// src/lib/supabase/profile.ts
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

/**
 * Returns the profile for the given user, creating one if it does not exist.
 * Throws on unexpected database errors.
 */
export async function ensureProfile(user: User): Promise<Profile> {
  const supabase = createClient()

  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (fetchError) throw fetchError

  if (existing) return existing as Profile

  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      username: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
      avatar_url: user.user_metadata?.avatar_url || null,
    })
    .select()
    .single()

  if (insertError) throw insertError

  return created as Profile
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no new errors.

**Step 3: Commit**

```bash
git add src/lib/supabase/profile.ts
git commit -m "refactor: extract ensureProfile helper to eliminate 4x copy-paste"
```

---

## Task 3: Create `src/components/LoadingScreen.tsx`

**Files:**
- Create: `src/components/LoadingScreen.tsx`

**Step 1: Create the file**

```typescript
// src/components/LoadingScreen.tsx
export default function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/LoadingScreen.tsx
git commit -m "refactor: extract LoadingScreen component"
```

---

## Task 4: Create `src/components/icons/MusicNoteIcon.tsx`

**Files:**
- Create: `src/components/icons/MusicNoteIcon.tsx`

**Step 1: Create the file**

```typescript
// src/components/icons/MusicNoteIcon.tsx
interface MusicNoteIconProps {
  className?: string
}

export default function MusicNoteIcon({ className }: MusicNoteIconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1}
        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
      />
    </svg>
  )
}
```

**Step 2: Commit**

```bash
git add src/components/icons/MusicNoteIcon.tsx
git commit -m "refactor: extract MusicNoteIcon component"
```

---

## Task 5: Create `src/components/AppHeader.tsx`

**Files:**
- Create: `src/components/AppHeader.tsx`

The `ProfileMenu` component is currently defined inline in `page.tsx` lines 8–74. Extract it into `AppHeader`. The header appears in all 4 pages with slightly different markup — this unifies them.

**Step 1: Create the file**

```typescript
// src/components/AppHeader.tsx
'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'

interface AppHeaderProps {
  user: User | null
  onSignOut: () => void
  /** If provided, renders a back arrow linking here instead of the full nav */
  backHref?: string
}

function ProfileMenu({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const avatarLetter = user.email?.[0]?.toUpperCase() || '?'

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 rounded-full bg-[#1DB954] flex items-center justify-center text-black font-bold text-sm hover:bg-[#1ed760] transition-colors"
      >
        {avatarLetter}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 z-50">
          <Link
            href="/profile"
            className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Profile
          </Link>
          <button
            onClick={() => { setIsOpen(false); onSignOut() }}
            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  )
}

export default function AppHeader({ user, onSignOut, backHref }: AppHeaderProps) {
  return (
    <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        {backHref ? (
          <Link
            href={backHref}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        ) : (
          <Link href="/" className="text-xl font-bold text-white hover:text-[#1DB954] transition-colors">
            TuneTribe
          </Link>
        )}

        <div className="flex items-center gap-4">
          {user ? (
            <ProfileMenu user={user} onSignOut={onSignOut} />
          ) : (
            <Link
              href="/login"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/components/AppHeader.tsx
git commit -m "refactor: extract AppHeader with ProfileMenu from page.tsx"
```

---

## Task 6: Create `src/hooks/useRequireAuth.ts`

**Files:**
- Create: `src/hooks/useRequireAuth.ts`

Used by `profile/page.tsx` and `events/new/page.tsx` to replace the manual `useEffect → getUser → if (!user) router.push('/login')` pattern.

**Step 1: Create the file**

```typescript
// src/hooks/useRequireAuth.ts
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/useAuthStore'

/**
 * Redirects to /login if the user is not authenticated.
 * Returns the auth store state (user, profile, loading).
 */
export function useRequireAuth() {
  const router = useRouter()
  const { user, profile, loading, fetchUser } = useAuthStore()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  return { user, profile, loading }
}
```

**Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

**Step 3: Commit**

```bash
git add src/hooks/useRequireAuth.ts
git commit -m "refactor: add useRequireAuth hook for pages requiring auth"
```

---

## Task 7: Update `useAuthStore.ts`

**Files:**
- Modify: `src/stores/useAuthStore.ts`

Currently `createClient()` is called inside each action. Move the client to module level so it's a singleton.

**Step 1: Read the current file**

Read `src/stores/useAuthStore.ts` to see the exact current implementation.

**Step 2: Move supabase to module level**

The file currently calls `createClient()` inside `fetchUser` and `signOut`. Move it to module scope:

```typescript
// src/stores/useAuthStore.ts
import { create } from 'zustand'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/lib/types'

// Module-level singleton — not re-created on each action call
const supabase = createClient()

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  fetchUser: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  fetchUser: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      set({ user: null, profile: null, loading: false })
      return
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()
    set({ user, profile: profile ?? null, loading: false })
  },
  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null, loading: false })
  },
}))
```

**Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add src/stores/useAuthStore.ts
git commit -m "refactor: move supabase singleton to module level in useAuthStore"
```

---

## Task 8: Update `usePlayerStore.ts` — remove unused destructure

**Files:**
- Modify: `src/stores/usePlayerStore.ts`

**Step 1: Read the file**

Read `src/stores/usePlayerStore.ts` and find the line with `const { previewAudio, isPlaying } = get()` (around line 41).

**Step 2: Remove unused `isPlaying`**

Change:
```typescript
const { previewAudio, isPlaying } = get()
```
To:
```typescript
const { previewAudio } = get()
```

**Step 3: Verify lint**

```bash
npm run lint -- --max-warnings 0 src/stores/usePlayerStore.ts
```

**Step 4: Commit**

```bash
git add src/stores/usePlayerStore.ts
git commit -m "fix: remove unused isPlaying destructure in usePlayerStore"
```

---

## Task 9: Refactor `src/lib/music-api/spotify-auth.ts`

**Files:**
- Modify: `src/lib/music-api/spotify-auth.ts`

This is the largest library cleanup. Changes:
1. Delete `getCookies` function (dead, ESLint warns)
2. Fix `typeof localStorage === 'undefined'` → `typeof window === 'undefined'`
3. Remove all `console.log` debug banners
4. Remove duplicate `TopArtist` interface, import from `src/lib/types.ts`
5. Replace inline `normalizeGenres` with import from `./genres`

**Step 1: Read the file**

Read the full `src/lib/music-api/spotify-auth.ts` to understand current structure.

**Step 2: Apply all changes**

Make the following edits (in order):

a) Add import at top:
```typescript
import { normalizeGenres } from './genres'
import type { TopArtist, TopTrack } from '@/lib/types'
```

b) Delete the `getCookies` function (lines 15–37 approximately).

c) Fix the localStorage guard (line ~109):
```typescript
// Before:
if (typeof localStorage === 'undefined') return null
// After:
if (typeof window === 'undefined') return null
```

d) Delete the duplicate `TopArtist` interface definition (lines ~256–260).

e) Remove all `console.log` statements throughout the file.

f) Replace the inline `normalizeGenres` function and its `GENRE_MAPPING` constant (lines ~313–397) with a call to the imported `normalizeGenres`.

**Step 3: Verify TypeScript and lint**

```bash
npx tsc --noEmit
npm run lint src/lib/music-api/spotify-auth.ts
```

**Step 4: Commit**

```bash
git add src/lib/music-api/spotify-auth.ts
git commit -m "refactor: clean up spotify-auth.ts (dead code, console.logs, types, localStorage guard)"
```

---

## Task 10: Delete `src/lib/music-api/spotify.ts` and update `index.ts`

**Files:**
- Delete: `src/lib/music-api/spotify.ts`
- Modify: `src/lib/music-api/index.ts`

`spotify.ts` is entirely dead code. The album search functions are never called, `getTopGenres`/`getTopTracks` are shadowed by `spotify-auth.ts` re-exports in `index.ts`, and `spotifyFetch`/`spotifyClient` are disconnected from the real auth flow.

**Step 1: Read `index.ts`**

Read `src/lib/music-api/index.ts` to see what it re-exports from `spotify.ts`.

**Step 2: Update `index.ts`**

Remove any re-exports that reference `./spotify`. Keep the `spotify-auth.ts` re-exports.

**Step 3: Delete `spotify.ts`**

```bash
git rm src/lib/music-api/spotify.ts
```

**Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```
Expected: no errors related to missing imports.

**Step 5: Commit**

```bash
git add src/lib/music-api/index.ts
git commit -m "refactor: delete dead spotify.ts module, clean up index.ts exports"
```

---

## Task 11: Update `src/lib/types.ts` — delete `MusicProviderType`

**Files:**
- Modify: `src/lib/types.ts`

`MusicProviderType` is a duplicate of `MusicSource` (same union members, different name). Check if `MusicProviderType` is used anywhere before deleting.

**Step 1: Check usages**

```bash
grep -r "MusicProviderType" src/
```
Expected: only found in `src/lib/types.ts` itself and possibly `music-api/types.ts`.

**Step 2: Read `src/lib/music-api/types.ts`**

Read this file — it may have `MusicProviderType` and an unused `Genre` import.

**Step 3: Remove `MusicProviderType` from `types.ts` and clean `music-api/types.ts`**

In `src/lib/types.ts`, delete the `MusicProviderType` type alias.

In `src/lib/music-api/types.ts`, remove the unused `Genre` import and replace `MusicProviderType` with `MusicSource` if used.

**Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

**Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/music-api/types.ts
git commit -m "refactor: remove duplicate MusicProviderType, use MusicSource"
```

---

## Task 12: Clean `src/lib/supabase/server.ts`

**Files:**
- Modify: `src/lib/supabase/server.ts`

Remove unused `CookieOptions` import.

**Step 1: Read the file**

Read `src/lib/supabase/server.ts`.

**Step 2: Remove unused import**

Change:
```typescript
import { createServerClient, type CookieOptions } from '@supabase/ssr'
```
To:
```typescript
import { createServerClient } from '@supabase/ssr'
```

**Step 3: Verify lint**

```bash
npm run lint src/lib/supabase/server.ts
```

**Step 4: Commit**

```bash
git add src/lib/supabase/server.ts
git commit -m "fix: remove unused CookieOptions import from supabase/server.ts"
```

---

## Task 13: Refactor `src/app/page.tsx`

**Files:**
- Modify: `src/app/page.tsx`

This is the largest page refactor (~470 lines → ~250 lines). Changes:
- Remove `ProfileMenu` component definition (moved to `AppHeader`)
- Replace header JSX with `<AppHeader>`
- Replace loading block with `<LoadingScreen />`
- Wire `useAuthStore` instead of local `useState<any>` for user
- Replace inline `ensureProfile` with helper
- Fix city initial state bug: `useState('Toronto')` → `useState('')`
- Remove dead `menuOpen`/`setMenuOpen` state
- Deduplicate genre comparison into `isGenreSelected` helper

**Step 1: Read the current file**

Read `src/app/page.tsx` in full.

**Step 2: Apply changes**

Replace the file content applying all the changes described above. Key points:

```typescript
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/useAuthStore'
import { ensureProfile } from '@/lib/supabase/profile'
import AppHeader from '@/components/AppHeader'
import LoadingScreen from '@/components/LoadingScreen'
import MusicNoteIcon from '@/components/icons/MusicNoteIcon'
import type { Event, City, Genre } from '@/lib/types'

// ... component body uses useAuthStore() instead of local useState<any>
// City initial state: useState('') not useState('Toronto')
// Genre comparison: const isGenreSelected = (g: Genre) => selectedGenres.some(sg => sg.toLowerCase() === g.name.toLowerCase())
```

**Step 3: Verify TypeScript and lint**

```bash
npx tsc --noEmit
npm run lint src/app/page.tsx
```

**Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "refactor: clean up page.tsx - use AppHeader, useAuthStore, fix city bug, remove dead code"
```

---

## Task 14: Refactor `src/app/profile/page.tsx`

**Files:**
- Modify: `src/app/profile/page.tsx`

Changes:
- Replace header with `<AppHeader>`
- Replace loading with `<LoadingScreen />`
- Use `useRequireAuth()` instead of manual getUser + redirect
- Replace `SpotifyData.tracks: any[]` with `Track[]`; `topArtists: any[]` with `TopArtist[]`
- Remove `useRef`, `showDropdown` dead state
- Remove debug `useEffect` logger (the one that only does `console.log`)
- Remove 20+ `console.log`s from `syncSpotifyData`
- Replace inline `ensureProfile` call in `syncSpotifyData` with helper

**Step 1: Read the current file**

Read `src/app/profile/page.tsx` in full.

**Step 2: Apply changes**

```typescript
import { useState, useEffect, useCallback } from 'react'
// Remove useRef

import { useRequireAuth } from '@/hooks/useRequireAuth'
import AppHeader from '@/components/AppHeader'
import LoadingScreen from '@/components/LoadingScreen'
import MusicNoteIcon from '@/components/icons/MusicNoteIcon'
import { ensureProfile } from '@/lib/supabase/profile'
import type { Track, TopArtist } from '@/lib/types'

// SpotifyData interface:
interface SpotifyData {
  genres: string[]
  tracks: Track[]         // was any[]
  topArtists: TopArtist[] // was any[]
}

// Use useRequireAuth() instead of manual useState<any> for user
const { user, profile: initialProfile, loading } = useRequireAuth()

// Remove: debug useEffect that only console.logs
// Remove: showDropdown state
// Remove: all console.log from syncSpotifyData
// In syncSpotifyData, replace inline profile creation with: await ensureProfile(user)
```

**Step 3: Verify TypeScript and lint**

```bash
npx tsc --noEmit
npm run lint src/app/profile/page.tsx
```

**Step 4: Commit**

```bash
git add src/app/profile/page.tsx
git commit -m "refactor: clean up profile/page.tsx - types, useRequireAuth, AppHeader, remove debug logs"
```

---

## Task 15: Refactor `src/app/events/new/page.tsx`

**Files:**
- Modify: `src/app/events/new/page.tsx`

Changes:
- Replace header with `<AppHeader backHref="/" ...>`
- Use `useRequireAuth()`
- Remove dead `handleLogout`, `cities` state, unused `City` import
- Fix `catch (err: any)` → `unknown`

**Step 1: Read the current file**

Read `src/app/events/new/page.tsx` in full.

**Step 2: Apply changes**

```typescript
import { useRequireAuth } from '@/hooks/useRequireAuth'
import AppHeader from '@/components/AppHeader'
import LoadingScreen from '@/components/LoadingScreen'
// Remove: City import (unused after removing cities state)

const { user, loading } = useRequireAuth()
// Remove: local useState<any> for user
// Remove: useState<City[]> for cities
// Remove: handleLogout
// Error handling: catch (err: unknown) { const message = err instanceof Error ? err.message : 'Failed to create event'; setError(message) }
```

**Step 3: Verify TypeScript and lint**

```bash
npx tsc --noEmit
npm run lint src/app/events/new/page.tsx
```

**Step 4: Commit**

```bash
git add src/app/events/new/page.tsx
git commit -m "refactor: clean up events/new - useRequireAuth, AppHeader, remove dead code"
```

---

## Task 16: Refactor `src/app/events/[id]/page.tsx`

**Files:**
- Modify: `src/app/events/[id]/page.tsx`

Changes:
- Delete inline `Header` component, replace with `<AppHeader backHref="/" ...>`
- Fix RSVP error handling — check Supabase result, roll back on failure
- Remove unused `Profile` import
- Replace `useState<any>` for user with `useAuthStore`

**Step 1: Read the current file**

Read `src/app/events/[id]/page.tsx` in full.

**Step 2: Apply changes**

```typescript
import AppHeader from '@/components/AppHeader'
import LoadingScreen from '@/components/LoadingScreen'
import MusicNoteIcon from '@/components/icons/MusicNoteIcon'
import { useAuthStore } from '@/stores/useAuthStore'
// Remove: inline Header component definition
// Remove: Profile import (unused)

// RSVP error handling fix:
const handleRSVP = async () => {
  if (!user) return
  if (isAttending) {
    const { error } = await supabase.from('event_attendees').delete().match({ event_id: id, user_id: user.id })
    if (error) { console.error('RSVP remove failed:', error); return }
    setIsAttending(false)
  } else {
    const { error } = await supabase.from('event_attendees').insert({ event_id: id, user_id: user.id, rsvp_status: 'going' })
    if (error) { console.error('RSVP add failed:', error); return }
    setIsAttending(true)
  }
}
```

**Step 3: Verify TypeScript and lint**

```bash
npx tsc --noEmit
npm run lint "src/app/events/[id]/page.tsx"
```

**Step 4: Commit**

```bash
git add "src/app/events/[id]/page.tsx"
git commit -m "refactor: clean up events/[id] - AppHeader, fix RSVP error handling, remove dead code"
```

---

## Task 17: Refactor `src/app/login/page.tsx`

**Files:**
- Modify: `src/app/login/page.tsx`

Changes:
- Remove unused `Link` import
- Replace `alert()` with inline success message state
- Fix `catch (err: any)` → `unknown` in all 3 handlers
- Fix unescaped apostrophe in JSX

**Step 1: Read the current file**

Read `src/app/login/page.tsx` in full.

**Step 2: Apply changes**

```typescript
// Remove: import Link from 'next/link'

// Add success state:
const [success, setSuccess] = useState<string | null>(null)

// In handleSignUp, replace alert() with:
setSuccess('Check your email for the confirmation link!')

// Add success display in JSX (above or near the error display):
{success && (
  <div className="bg-green-900/30 border border-green-500 text-green-400 rounded-lg p-3 text-sm">
    {success}
  </div>
)}

// Error handlers:
catch (err: unknown) {
  setError(err instanceof Error ? err.message : 'An error occurred')
}

// Fix JSX entity:
// "Don't have an account?" → "Don&apos;t have an account?"
```

**Step 3: Verify TypeScript and lint**

```bash
npx tsc --noEmit
npm run lint src/app/login/page.tsx
```

**Step 4: Commit**

```bash
git add src/app/login/page.tsx
git commit -m "fix: replace alert() with success state, fix catch types, fix JSX entity in login"
```

---

## Task 18: Clean up auth callback pages and API route

**Files:**
- Modify: `src/app/auth/callback/page.tsx`
- Modify: `src/app/callback/route.ts`
- Modify: `src/app/callback/success/page.tsx`

**Step 1: Read all three files**

Read each file.

**Step 2: `auth/callback/page.tsx`**

Replace inline profile-creation logic with:
```typescript
import { ensureProfile } from '@/lib/supabase/profile'
// ...
await ensureProfile(user)
```

**Step 3: `callback/route.ts`**

Remove all `console.log` statements.

**Step 4: `callback/success/page.tsx`**

Remove all `console.log` statements.

**Step 5: Verify TypeScript and lint**

```bash
npx tsc --noEmit
npm run lint src/app/auth/callback/page.tsx src/app/callback/route.ts src/app/callback/success/page.tsx
```

**Step 6: Commit**

```bash
git add src/app/auth/callback/page.tsx src/app/callback/route.ts src/app/callback/success/page.tsx
git commit -m "refactor: use ensureProfile helper in auth callback, remove console.logs"
```

---

## Task 19: Delete debug scripts from repo root

**Files:**
- Delete: `test-cookie.js`
- Delete: `test-supabase.mjs`

**Step 1: Delete the files**

```bash
git rm test-cookie.js test-supabase.mjs
```

**Step 2: Commit**

```bash
git commit -m "chore: remove ad-hoc debug scripts from repo root"
```

---

## Task 20: Final verification

**Step 1: Run lint**

```bash
npm run lint
```
Expected: 0 errors, 0 warnings (or close to 0).

**Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: 0 errors.

**Step 3: Run build**

```bash
npm run build
```
Expected: clean build, no compilation errors.

**Step 4: If lint/type errors remain, fix them**

For any remaining issues, fix them individually and commit:
```bash
git add [files]
git commit -m "fix: address remaining lint/type issues"
```

---

## Summary

**New files created:** 6
- `src/components/AppHeader.tsx`
- `src/components/LoadingScreen.tsx`
- `src/components/icons/MusicNoteIcon.tsx`
- `src/lib/supabase/profile.ts`
- `src/lib/music-api/genres.ts`
- `src/hooks/useRequireAuth.ts`

**Files deleted:** 3
- `src/lib/music-api/spotify.ts`
- `test-cookie.js`
- `test-supabase.mjs`

**Files modified:** 12
- `src/stores/useAuthStore.ts`
- `src/stores/usePlayerStore.ts`
- `src/lib/music-api/spotify-auth.ts`
- `src/lib/music-api/index.ts`
- `src/lib/types.ts`
- `src/lib/music-api/types.ts`
- `src/lib/supabase/server.ts`
- `src/app/page.tsx`
- `src/app/profile/page.tsx`
- `src/app/events/new/page.tsx`
- `src/app/events/[id]/page.tsx`
- `src/app/login/page.tsx`
- `src/app/auth/callback/page.tsx`
- `src/app/callback/route.ts`
- `src/app/callback/success/page.tsx`

**Expected result:** ESLint 42 errors → 0, 42 warnings → 0. TypeScript ~35 `any` usages → 0. Clean production build.
