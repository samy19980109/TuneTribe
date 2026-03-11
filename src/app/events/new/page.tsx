'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Genre } from '@/lib/types'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useAuthStore } from '@/stores/useAuthStore'
import AppHeader from '@/components/AppHeader'
import LoadingScreen from '@/components/LoadingScreen'

const supabase = createClient()

export default function NewEventPage() {
  const router = useRouter()

  const { user, loading } = useRequireAuth()
  const { signOut } = useAuthStore()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [venue, setVenue] = useState('')
  const [address, setAddress] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringPattern, setRecurringPattern] = useState('')
  const [genreId, setGenreId] = useState('')
  const [maxAttendees, setMaxAttendees] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [cityId] = useState('')

  const [genres, setGenres] = useState<Genre[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('genres').select('*').then(({ data }) => {
      setGenres(data || [])
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSubmitting(true)
    setError('')

    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .insert({
          title,
          description: description || null,
          organizer_id: user.id,
          city_id: cityId || null,
          venue,
          address: address || null,
          date: date || null,
          time: time || null,
          is_recurring: isRecurring,
          recurring_pattern: isRecurring ? recurringPattern : null,
          genre_id: genreId || null,
          cover_image: coverImage || null,
          max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
        })
        .select()
        .single()

      if (eventError) throw eventError

      router.push(`/events/${event.id}`)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create event'
      setError(message)
    }

    setSubmitting(false)
  }

  const recurringOptions = [
    { value: 'weekly_friday', label: 'Every Friday' },
    { value: 'weekly_saturday', label: 'Every Saturday' },
    { value: 'weekly_sunday', label: 'Every Sunday' },
    { value: 'monthly_first', label: 'First week of month' },
    { value: 'biweekly', label: 'Every 2 weeks' },
  ]

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <AppHeader user={user} onSignOut={signOut} backHref="/" />

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">Event Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="e.g., Saturday Night Vinyl Listening"
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#1DB954]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What can attendees expect?"
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#1DB954] resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Genre</label>
            <select
              value={genreId}
              onChange={(e) => setGenreId(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#1DB954]"
            >
              <option value="">Select a genre</option>
              {genres.map((genre) => (
                <option key={genre.id} value={genre.id}>{genre.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Venue *</label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              required
              placeholder="e.g., Someone's Living Room, Community Center"
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#1DB954]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full address"
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#1DB954]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#1DB954]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#1DB954]"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isRecurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 accent-[#1DB954]"
            />
            <label htmlFor="isRecurring" className="text-sm font-medium">
              This is a recurring event
            </label>
          </div>

          {isRecurring && (
            <div>
              <label className="block text-sm font-medium mb-2">Recurring Pattern</label>
              <select
                value={recurringPattern}
                onChange={(e) => setRecurringPattern(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#1DB954]"
              >
                <option value="">Select pattern</option>
                {recurringOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Cover Image URL</label>
            <input
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="https://..."
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#1DB954]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Max Attendees</label>
            <input
              type="number"
              value={maxAttendees}
              onChange={(e) => setMaxAttendees(e.target.value)}
              min={2}
              placeholder="Leave empty for unlimited"
              className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#1DB954]"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Event'}
          </button>
        </form>
      </main>
    </div>
  )
}
