'use client'

import { useState, useEffect, useCallback } from 'react'
import { getStoredAccessToken, refreshAccessToken, hasStreamingScopes } from '@/lib/music-api/spotify-auth'
import { transferPlayback } from '@/lib/music-api/spotify-playback'
import { usePlayerStore } from '@/stores/usePlayerStore'

const SCRIPT_URL = 'https://sdk.scdn.co/spotify-player.js'

let scriptLoaded = false
let scriptLoading = false

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

interface UseSpotifySDKReturn {
  player: Spotify.Player | null
  deviceId: string | null
  isReady: boolean
  isPremium: boolean
  error: string | null
  needsReauth: boolean
}

export function useSpotifySDK(): UseSpotifySDKReturn {
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [isPremium, setIsPremium] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsReauth, setNeedsReauth] = useState(() => {
    if (typeof window === 'undefined') return false
    if (isMobile()) return false
    if (!hasStreamingScopes() && getStoredAccessToken()) return true
    return false
  })
  const [player, setPlayer] = useState<Spotify.Player | null>(null)

  const getOAuthToken = useCallback((cb: (token: string) => void) => {
    // Try sync first — the SDK needs the token ASAP
    const token = getStoredAccessToken()
    if (token) {
      cb(token)
      return
    }
    // Fall back to async refresh
    refreshAccessToken().then((newToken) => {
      if (newToken) cb(newToken)
    })
  }, [])

  useEffect(() => {
    if (isMobile()) return
    if (!hasStreamingScopes()) return

    const initPlayer = () => {
      const p = new window.Spotify.Player({
        name: 'TuneTribe',
        getOAuthToken,
        volume: 0.8,
      })

      p.addListener('ready', ({ device_id }) => {
        console.log('[TuneTribe] Spotify SDK ready, device_id:', device_id)

        const diagToken = getStoredAccessToken()
        if (!diagToken) {
          setDeviceId(device_id)
          setIsReady(true)
          setIsPremium(true)
          return
        }

        // Verify scopes, then proactively activate the device
        fetch('https://api.spotify.com/v1/me/player/devices', {
          headers: { Authorization: `Bearer ${diagToken}` },
        })
          .then(async (r) => {
            if (r.status === 401 || r.status === 403) {
              console.warn('[TuneTribe] Token lacks playback scopes, triggering re-auth')
              localStorage.removeItem('spotify_granted_scopes')
              setNeedsReauth(true)
              setIsPremium(false)
              p.disconnect()
              return
            }

            // Proactively transfer playback to this device so Spotify's
            // backend registers it as active BEFORE any play request
            console.log('[TuneTribe] Activating SDK device...')
            const activated = await transferPlayback(device_id, diagToken)
            console.log('[TuneTribe] Device activation:', activated ? 'success' : 'failed (will retry at play time)')

            setDeviceId(device_id)
            setIsReady(true)
            setIsPremium(true)
          })
          .catch(() => {
            setDeviceId(device_id)
            setIsReady(true)
            setIsPremium(true)
          })
      })

      p.addListener('not_ready', ({ device_id }) => {
        console.warn('[TuneTribe] Spotify SDK device not ready:', device_id)
        setIsReady(false)
      })

      p.addListener('player_state_changed', (state) => {
        if (!state) return
        usePlayerStore.getState().updateFromSDKState(state)
      })

      p.addListener('initialization_error', ({ message }) => {
        console.error('[TuneTribe] SDK init error:', message)
        setError(message)
        setIsPremium(false)
      })

      p.addListener('authentication_error', ({ message }) => {
        console.error('[TuneTribe] SDK auth error:', message)
        setNeedsReauth(true)
        setIsPremium(false)
      })

      p.addListener('account_error', ({ message }) => {
        console.error('[TuneTribe] SDK account error (not Premium?):', message)
        setIsPremium(false)
      })

      p.addListener('playback_error', ({ message }) => {
        console.error('[TuneTribe] SDK playback error:', message)
      })

      p.connect().then((success) => {
        if (success) {
          console.log('[TuneTribe] SDK player.connect() succeeded, waiting for ready event...')
        } else {
          console.error('[TuneTribe] SDK player.connect() returned false')
          setError('Failed to connect Spotify player')
        }
      })

      setPlayer(p)
    }

    if (scriptLoaded && window.Spotify) {
      initPlayer()
    } else if (!scriptLoading) {
      scriptLoading = true
      window.onSpotifyWebPlaybackSDKReady = () => {
        scriptLoaded = true
        initPlayer()
      }

      const script = document.createElement('script')
      script.src = SCRIPT_URL
      script.async = true
      script.onerror = () => {
        console.error('[TuneTribe] Failed to load Spotify SDK script')
        setError('Failed to load Spotify SDK')
        scriptLoading = false
      }
      document.body.appendChild(script)
    } else {
      // Script is loading, wait for callback
      const prevCallback = window.onSpotifyWebPlaybackSDKReady
      window.onSpotifyWebPlaybackSDKReady = () => {
        prevCallback?.()
        scriptLoaded = true
        initPlayer()
      }
    }

    return () => {
      setPlayer((prev) => {
        prev?.disconnect()
        return null
      })
      setIsReady(false)
      setDeviceId(null)
    }
  }, [getOAuthToken])

  return {
    player,
    deviceId,
    isReady,
    isPremium,
    error,
    needsReauth,
  }
}
