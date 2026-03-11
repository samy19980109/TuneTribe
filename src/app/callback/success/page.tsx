'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Parse and store Spotify tokens from URL params.
 * Returns an error string or null.
 * Called once synchronously during component init (safe — runs only in browser, after hydration).
 */
function extractAndStoreTokens(): string | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const tokenHash = params.get('token')
  const refreshHash = params.get('refresh')

  if (!tokenHash) return 'No token received'

  try {
    const token = atob(tokenHash.replace(/-/g, '+').replace(/_/g, '/'))
    localStorage.setItem('spotify_access_token', token)

    if (refreshHash) {
      const refreshToken = atob(refreshHash.replace(/-/g, '+').replace(/_/g, '/'))
      localStorage.setItem('spotify_refresh_token', refreshToken)
    }

    sessionStorage.setItem('just_authed', 'true')
    return null
  } catch (e) {
    console.error('Failed to store token:', e)
    return 'Failed to store authentication token'
  }
}

export default function CallbackSuccess() {
  const router = useRouter()
  // Initialize error synchronously from URL params — no useEffect needed for detection
  const [error] = useState<string | null>(() => extractAndStoreTokens())

  useEffect(() => {
    if (error) {
      console.error('Spotify callback error:', error)
      return
    }
    const params = new URLSearchParams(window.location.search)
    const next = params.get('next') || '/'
    router.push(decodeURIComponent(next))
  }, [error, router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <a href="/profile" className="text-blue-500 underline">Go to Profile</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Completing authentication...</p>
    </div>
  )
}
