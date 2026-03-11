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
