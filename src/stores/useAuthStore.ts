import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  profile: {
    id: string
    username: string | null
    avatar_url: string | null
  } | null
  loading: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: AuthState['profile']) => void
  fetchUser: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,

  setUser: (user) => set({ user }),
  
  setProfile: (profile) => set({ profile }),

  fetchUser: async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', user.id)
        .single()
      
      set({ user, profile: profile as AuthState['profile'], loading: false })
    } else {
      set({ user: null, profile: null, loading: false })
    }
  },

  signOut: async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },
}))
