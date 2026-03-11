'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ensureProfile } from '@/lib/supabase/profile'

export default function AuthCallback() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error) {
        console.error('Auth callback error:', error)
        router.push('/login?error=auth_failed')
        return
      }

      if (session) {
        await ensureProfile(session.user)
        router.push('/')
      } else {
        router.push('/login')
      }
    }

    handleCallback()
  }, [router, supabase])

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-white">Completing sign in...</div>
    </div>
  )
}
