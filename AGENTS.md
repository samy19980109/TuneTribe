# TuneTribe - Agent Guidelines

## Build, Lint, and Test Commands

```bash
# Development
npm run dev              # Start Next.js development server

# Build
npm run build            # Build for production
npm run start            # Start production server

# Linting
npm run lint             # Run ESLint on entire project
npm run lint -- --fix   # Auto-fix linting issues

# TypeScript
npx tsc --noEmit         # Type-check without emitting
```

## Project Overview

- **Stack**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Backend**: Supabase (Auth, Database)
- **State**: Zustand for client-side state management
- **Path Alias**: `@/*` maps to `./src/*`

## Code Style Guidelines

### Imports

- Use path alias `@/` for internal imports: `import { something } from '@/lib/types'`
- Group imports in this order: external → internal → types
- Use type-only imports for types: `import type { Event, Profile } from '@/lib/types'`
- Relative imports for same-module files: `import { helper } from '../utils'`

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

- **Components**: PascalCase (`ProfileMenu`, `EventCard`)
- **Files**: PascalCase for components (`.tsx`), camelCase for utilities (`.ts`)
- **Hooks**: Prefix with `use` (`usePlayerStore`, `useAuthStore`)
- **Zustand stores**: `useXxxStore` pattern (`usePlayerStore`)
- **Types/Interfaces**: PascalCase, descriptive (`Event`, `UserTopGenres`)
- **Constants**: SCREAMING_SNAKE_CASE for config values

### TypeScript

- Enable strict mode - always define proper types
- Use interfaces for object shapes, types for unions/aliases
- Avoid `any` - use `unknown` if type is truly uncertain
- Use `null` instead of `undefined` for nullable database fields

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

- Use `'use client'` directive for components using hooks or browser APIs
- Destructure props when clean, otherwise use explicit prop types
- Use functional components exclusively
- Handle loading/error states explicitly

```typescript
// Client component with 'use client'
'use client'

import { useState, useEffect } from 'react'

export default function EventList() {
  const [events, setEvents] = useState<Event[]>([])
  
  // ...
}
```

### Error Handling

- API routes: Use try/catch with proper error logging
- Always return meaningful JSON responses
- Log errors with context using `console.error`

```typescript
// Good - API route error handling
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

### State Management (Zustand)

- Create stores in `src/stores/` with `useXxxStore` naming
- Define interface for state and actions
- Use functional updates for complex state

```typescript
// Good
interface PlayerState {
  currentTrack: Track | null
  setCurrentTrack: (track: Track | null) => void
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrack: null,
  setCurrentTrack: (track) => set({ currentTrack: track }),
}))
```

### Tailwind CSS

- Use Tailwind 4 syntax (no `tailwind.config.ts` needed)
- Use semantic color tokens: `bg-gray-900`, `text-white`, `border-gray-800`
- Use Spotify green: `bg-[#1DB954]`, `hover:bg-[#1ed760]`
- Use `group` and `group-hover` for hover states on child elements
- Use `transition-colors` for color transitions

```tsx
// Good
<button className="bg-[#1DB954] hover:bg-[#1ed760] text-black px-4 py-2 rounded-lg transition-colors">
  Get Started
</button>

<Link href="/events" className="group hover:text-[#1DB954] transition-colors">
  <span className="group-hover:scale-105 transition-transform">View</span>
</Link>
```

### Database (Supabase)

- Use `.maybeSingle()` for optional rows
- Use `.single()` when exactly one row expected
- Always handle null in responses: `data || []`
- Use proper error handling for database operations

```typescript
// Good
const { data } = await supabase
  .from('events')
  .select('*, city:cities(*)')
  .eq('city_id', cityId)
  .maybeSingle()

// Handle response
setEvents(data || [])
```

### File Organization

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (route.ts)
│   ├── events/           # Event pages
│   ├── profile/          # Profile page
│   └── page.tsx          # Home page
├── components/            # Reusable components
├── lib/
│   ├── music-api/        # Music service integrations
│   ├── supabase/         # Supabase client/server
│   └── types.ts          # TypeScript types
└── stores/               # Zustand stores
```

### General Patterns

- Use `async/await` over Promise chains
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Keep components focused (single responsibility)
- Extract complex logic into custom hooks or utilities
- Use early returns for cleaner conditionals

```typescript
// Good
if (loading) {
  return <LoadingSpinner />
}

if (!user) {
  return <LoginPrompt />
}

// Main logic here

// Avoid
const data = user ? (loading ? null : events) : []
```

### ESLint Configuration

The project uses `eslint-config-next` with TypeScript. Run `npm run lint` before committing. Key rules:
- No unused variables
- Strict TypeScript checking
- React hooks exhaustive deps
