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
