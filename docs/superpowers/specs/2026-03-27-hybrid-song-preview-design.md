# Hybrid Song Preview on Vote Page

## Problem

Users on the vote page swipe through nominated songs but can only see metadata (title, artist, album art). They can't hear what the song sounds like before voting. The existing preview button only works when Spotify provides a `preview_url` (30-second clip), which is increasingly `null` for many tracks.

## Solution

A hybrid playback system that uses the **Spotify Web Playback SDK** for Premium users (full track control, seek to chorus) and falls back to **HTML5 Audio `preview_url`** for non-Premium users. A "no preview" state handles tracks where neither option is available.

---

## Architecture

### Playback Tiers

| Tier | Condition | Behavior |
|------|-----------|----------|
| **SDK** | Premium + streaming scope + SDK loaded | Full track via Web Playback SDK, seeks to ~40% (chorus heuristic) |
| **Preview** | Non-Premium OR SDK unavailable, `preview_url` exists | 30-second clip via HTML5 Audio (existing behavior) |
| **None** | No SDK + no `preview_url` | Disabled play button, "No preview" tooltip |

### Component Flow

```
SwipeCardDeck
  ├── useSpotifySDK()        → { player, deviceId, isPremium }
  ├── usePlayerStore()        → { playTrack, stopTrack, isPlaying, playbackMode, progress }
  │
  ├── useEffect([currentIndex])  → auto playTrack(currentNom)
  ├── handleSwipeComplete()      → stopTrack()
  │
  └── SwipeCard
       ├── play/pause button (always visible on top card)
       ├── progress bar (thin, bottom of album art)
       └── playback mode badge ("Premium" / "Preview")
```

---

## New Files

### 1. `src/types/spotify-sdk.d.ts` — SDK Type Declarations

TypeScript declarations for the `Spotify` global namespace loaded via script tag:
- `Spotify.Player` class with `connect()`, `disconnect()`, `pause()`, `resume()`, `seek(position_ms)`, `getVolume()`, `setVolume()`
- `Spotify.WebPlaybackState` with `position`, `duration`, `paused`, `track_window`
- `window.onSpotifyWebPlaybackSDKReady` callback type

### 2. `src/hooks/useSpotifySDK.ts` — SDK Lifecycle Hook

Responsibilities:
- **Script loading**: Appends `<script src="https://sdk.scdn.co/spotify-player.js">` to `document.body` once (module-level guard). Only runs client-side.
- **Player init**: In `window.onSpotifyWebPlaybackSDKReady`, creates `new Spotify.Player({ name: 'TuneTribe', getOAuthToken, volume: 0.8 })` and calls `player.connect()`.
- **Token provisioning**: `getOAuthToken` callback reads from `getStoredAccessToken()`, refreshing via `refreshAccessToken()` if needed.
- **Premium detection**: Listens for `account_error` event (fires for free-tier users). Also detects missing `streaming` scope via `authentication_error`.
- **Mobile detection**: SDK doesn't work on mobile browsers. Detects via `navigator.userAgent` and skips SDK init entirely on mobile.
- **State sync**: `player_state_changed` listener dispatches to `usePlayerStore.getState().updateFromSDKState(state)`.

Exposes: `{ player, deviceId, isReady, isPremium, error, needsReauth }`

- `needsReauth` is true when user has a token but without `streaming` scope. Surfaces a non-disruptive prompt rather than force-redirecting.
- **Cleanup**: On unmount, calls `player.disconnect()` to remove the Spotify Connect device.

### 3. `src/lib/chorus-heuristic.ts` — Chorus Offset Calculator

Pure function `getChorusOffsetMs(durationMs: number): number`:
- Tracks < 2min: seek to 30%
- Tracks 2-5min: seek to 40%
- Tracks > 5min: seek to 35%
- Clamped: at least 15s from start, at least 30s before end

Simple heuristic for v1. Future enhancement: use Spotify Audio Analysis API for section boundaries.

### 4. `src/lib/music-api/spotify-playback.ts` — Playback API Wrapper

Thin wrapper around `PUT /me/player/play`:
- `startPlayback(deviceId, trackId, positionMs, token)` — calls the Spotify Connect API with `{ uris: ["spotify:track:{trackId}"], position_ms }` and `device_id` query param
- Handles token refresh on 401 via existing `refreshAccessToken()`
- Returns success/failure for fallback logic

---

## Modified Files

### 5. `src/lib/music-api/spotify-auth.ts` — Add Streaming Scopes

Current scopes: `user-read-private`, `user-read-email`, `user-top-read`, `user-library-read`

Add: `streaming`, `user-modify-playback-state`

Note: `user-read-playback-state` is not needed since we use SDK events for state, not the REST API.

This means existing users need to re-authorize. Handle gracefully:
- Store requested scopes in localStorage (`spotify_granted_scopes`) during callback flow
- Add `hasStreamingScopes(): boolean` helper
- When scopes are missing, `useSpotifySDK` sets `isPremium = false` and exposes `needsReauth = true` for a soft re-auth prompt

### 6. `src/stores/usePlayerStore.ts` — Extend with Hybrid Playback

New state fields:
```typescript
playbackMode: 'sdk' | 'preview' | 'none'
currentTrackId: string | null  // spotify_track_id, replaces currentTrack as source of truth for "what's playing"
normalizedProgress: number     // 0-1 range, computed from position/duration
```

**Progress normalization**: All progress is stored as 0-1 in `normalizedProgress`. The existing `progress` field (absolute seconds) is kept for backward compat but `normalizedProgress` is the canonical value for UI.
- SDK path: `updateFromSDKState` computes `state.position / state.duration`
- Preview path: `timeupdate` handler computes `audio.currentTime / audio.duration`

New methods:
- `playTrack(nomination, sdkPlayer, deviceId, isPremium)` — unified entry point:
  1. Premium path: call `startPlayback()` with chorus offset, set `playbackMode: 'sdk'`. **Auto-pause after 30 seconds** via a timeout to match the preview experience and avoid playing the full track.
  2. Preview path: call existing `playPreview(preview_url)`, set `playbackMode: 'preview'`
  3. No preview: set `playbackMode: 'none'`, `isPlaying: false`
- `stopTrack(sdkPlayer)` — SDK: `sdkPlayer.pause()` (fire-and-forget, no await needed), Preview: existing `stopPreview()`. Clears the 30s auto-pause timer if active.
- `toggleTrack(sdkPlayer)` — SDK: `player.resume()` / `player.pause()`, Preview: existing `togglePlay()`
- `updateFromSDKState(state)` — sync `normalizedProgress`, `duration`, `isPlaying` from SDK state

Existing `playPreview`, `stopPreview`, `togglePlay` remain unchanged for backward compatibility.

### 7. `src/components/voting/SwipeCard.tsx` — Enhanced Play/Pause UI

Props changes:
```typescript
// Remove: onPlayPreview: () => void
// Add:
onPlay: () => void
onStop: () => void
isPlaying: boolean
playbackMode: 'sdk' | 'preview' | 'none'
progress: number  // 0-1 normalized
```

UI changes:
- **Play button always visible** on top card (not gated on `preview_url`)
- Shows play/pause icon based on `isPlaying`
- `playbackMode: 'none'` shows disabled button with "No preview" on tap
- **Progress bar**: thin `bg-[#1DB954]` bar at bottom of album art area, width driven by `progress`
- **Mode badge**: small text below play button — "Premium" (green) or "Preview" (gray)

### 8. `src/components/voting/SwipeCardDeck.tsx` — Auto-play Lifecycle

Changes:
- Import `useSpotifySDK` hook
- Import extended store methods (`playTrack`, `stopTrack`, `playbackMode`, `progress`, `duration`)
- **Auto-play effect**: `useEffect` keyed on `currentIndex` calls `playTrack(currentNom, ...)`, cleanup calls `stopTrack()`
- **Swipe stop**: `handleSwipeComplete` calls `stopTrack(player)` instead of `stopPreview()`
- **Autoplay policy**: Catch rejected play promise, set `needsUserGesture` flag. Show "Tap to play" overlay on first card if autoplay blocked. Clear after first user interaction.
- Pass playback state props to `SwipeCard`

### 9. `src/components/voting/SongVotingSection.tsx` — Wire SDK to Leaderboard

- Import `useSpotifySDK` at this level (shared between vote tab and leaderboard tab)
- Pass unified `onPlay` handler to `SongLeaderboard` that calls `playTrack(nomination, ...)`

### 10. `src/components/voting/SongLeaderboard.tsx` — Enable Play for All Tracks

- Show play button for all songs (not just those with `preview_url`), since Premium users can play any track
- Accept full nomination for play callback

---

## Edge Cases & Error Handling

| Scenario | Handling |
|----------|----------|
| SDK script fails to load (network) | `sdkAvailable = false`, all playback via preview_url |
| `account_error` (non-Premium) | `isPremium = false` for session, use preview_url |
| `authentication_error` (missing scopes) | `needsReauth = true`, show soft re-auth banner |
| SDK `playback_error` | Fall back to preview_url for that track |
| `PUT /me/player/play` returns 403 | Fall back to preview_url |
| Autoplay blocked by browser | Show "Tap to play" overlay, clear after first gesture |
| Mobile browser | Skip SDK init entirely, use preview_url only |
| User has Spotify open elsewhere | `PUT /me/player/play` with `device_id` transfers playback to TuneTribe. This may interrupt user's current listening — acceptable tradeoff since user explicitly tapped play. |
| SDK playback duration | Auto-pause after 30 seconds from chorus offset to match preview experience |
| Token expires mid-session | `getOAuthToken` callback calls `refreshAccessToken()` |

---

## Implementation Sequence

1. **Foundation**: Type declarations, chorus heuristic, playback API wrapper, scope changes
2. **SDK Hook**: `useSpotifySDK` with script loading, player init, Premium detection
3. **Store Extension**: Add `playTrack`, `stopTrack`, `updateFromSDKState` to player store
4. **UI Integration**: Update SwipeCard, SwipeCardDeck, SongVotingSection, SongLeaderboard
5. **Polish**: Autoplay policy handling, re-auth prompt, error edge cases, progress bar animation

---

## Verification

1. **Premium user flow**: Connect Spotify Premium account, navigate to vote page, verify SDK initializes (check console for "Ready with Device ID"), swipe cards and confirm full track plays from ~40% mark, verify playback stops on swipe
2. **Non-Premium flow**: Use non-Premium account, verify `account_error` fires, confirm preview_url fallback works, verify "Preview" badge shows
3. **No preview flow**: Find a track with `preview_url: null` using non-Premium account, verify disabled play button with "No preview" tooltip
4. **Re-auth flow**: Use existing token without streaming scope, verify soft re-auth banner appears, complete re-auth and verify SDK activates
5. **Mobile**: Open on mobile browser, verify SDK doesn't attempt to load, verify preview_url fallback works
6. **Autoplay policy**: Open in fresh tab without prior interaction, verify "Tap to play" overlay appears
