'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CallbackSuccess() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const tokenHash = params.get('token')
    const refreshHash = params.get('refresh')
    const next = params.get('next') || '/'

    console.log('=== CALLBACK SUCCESS PAGE ===')
    console.log('Token hash:', tokenHash ? 'present' : 'null')
    console.log('Refresh hash:', refreshHash ? 'present' : 'null')
    console.log('Next path:', next)

    if (tokenHash) {
      try {
        const token = atob(tokenHash.replace(/-/g, '+').replace(/_/g, '/'))
        console.log('Decoded token (first 20 chars):', token.substring(0, 20) + '...')
        localStorage.setItem('spotify_access_token', token)
        console.log('Access token stored in localStorage')
        
        if (refreshHash) {
          const refreshToken = atob(refreshHash.replace(/-/g, '+').replace(/_/g, '/'))
          localStorage.setItem('spotify_refresh_token', refreshToken)
          console.log('Refresh token stored in localStorage')
        }
        
        sessionStorage.setItem('just_authed', 'true')
        console.log('Redirecting to:', decodeURIComponent(next))
        router.push(decodeURIComponent(next))
      } catch (e) {
        console.error('Failed to store token:', e)
        setError('Failed to store authentication token')
      }
    } else {
      console.error('No token received in callback')
      setError('No token received')
    }
  }, [router])

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
