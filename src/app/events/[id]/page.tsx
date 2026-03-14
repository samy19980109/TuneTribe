'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Event } from '@/lib/types'
import AppHeader from '@/components/AppHeader'
import LoadingScreen from '@/components/LoadingScreen'
import MusicNoteIcon from '@/components/icons/MusicNoteIcon'
import { useAuthStore } from '@/stores/useAuthStore'
import SongVotingSection from '@/components/voting/SongVotingSection'

// Module-level singleton — stable reference, no re-creation on each render
const supabase = createClient()

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.id as string

  const { user, loading: authLoading, fetchUser, signOut } = useAuthStore()

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAttending, setIsAttending] = useState(false)

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  // Fetch the event immediately — does not depend on auth state
  useEffect(() => {
    const fetchEvent = async () => {
      const { data: eventData } = await supabase
        .from('events')
        .select('*, city:cities(*), genre:genres(*), organizer:profiles!events_organizer_id_fkey(*)')
        .eq('id', eventId)
        .maybeSingle()

      setEvent(eventData)
      setLoading(false)
    }
    fetchEvent()
  }, [eventId])

  // Check attendance only after auth has resolved and we have a user
  useEffect(() => {
    if (authLoading || !user) return
    const checkAttendance = async () => {
      const { data: attendee } = await supabase
        .from('event_attendees')
        .select('*')
        .eq('event_id', eventId)
        .eq('user_id', user.id)
        .maybeSingle()

      if (attendee) {
        setIsAttending(true)
      }
    }
    checkAttendance()
  }, [eventId, user, authLoading])

  const handleRSVP = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    if (isAttending) {
      const { error } = await supabase
        .from('event_attendees')
        .delete()
        .match({ event_id: eventId, user_id: user.id })
      if (error) { console.error('RSVP remove failed:', error); return }
      setIsAttending(false)
    } else {
      const { error } = await supabase
        .from('event_attendees')
        .insert({ event_id: eventId, user_id: user.id, rsvp_status: 'going' })
      if (error) { console.error('RSVP add failed:', error); return }
      setIsAttending(true)
    }
  }

  if (loading) {
    return <LoadingScreen />
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Event not found</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <AppHeader user={user} onSignOut={signOut} backHref="/" />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Cover Image */}
        <div className="aspect-video bg-gray-900 rounded-xl overflow-hidden mb-8 relative">
          {event.cover_image ? (
            <img
              src={event.cover_image}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MusicNoteIcon className="w-20 h-20 text-gray-700" />
            </div>
          )}
        </div>

        {/* Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {event.genre && (
                <span className="text-sm font-medium bg-[#1DB954]/20 text-[#1DB954] px-3 py-1 rounded-full">
                  {event.genre.name}
                </span>
              )}
              {event.is_recurring && (
                <span className="text-sm font-medium bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full">
                  Recurring
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">{event.title}</h1>
            <p className="text-gray-400">
              Organized by {event.organizer?.username || 'Anonymous'}
            </p>
          </div>

          <button
            onClick={handleRSVP}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              isAttending
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30'
                : 'bg-[#1DB954] text-black hover:bg-[#1ed760]'
            }`}
          >
            {isAttending ? '✓ Going' : 'RSVP - I\'m Going'}
          </button>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-gray-300 mb-8 text-lg">{event.description}</p>
        )}

        {/* Details Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Event Details</h2>

            <div className="space-y-4">
              <div>
                <p className="text-gray-400 text-sm">Date & Time</p>
                <p className="font-medium">
                  {event.is_recurring && event.recurring_pattern ? (
                    <span className="text-blue-400 capitalize">
                      Every {event.recurring_pattern.replace('weekly_', '').replace('monthly_', '').replace('biweekly', '2 weeks')}
                    </span>
                  ) : event.date ? (
                    <>
                      {new Date(event.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                      {event.time && ` at ${event.time}`}
                    </>
                  ) : (
                    'TBD'
                  )}
                </p>
              </div>

              <div>
                <p className="text-gray-400 text-sm">Venue</p>
                <p className="font-medium">{event.venue}</p>
                {event.address && (
                  <p className="text-gray-400 text-sm">{event.address}</p>
                )}
              </div>

              <div>
                <p className="text-gray-400 text-sm">City</p>
                <p className="font-medium">
                  {event.city?.name}, {event.city?.state}
                </p>
              </div>

              {event.max_attendees && (
                <div>
                  <p className="text-gray-400 text-sm">Max Attendees</p>
                  <p className="font-medium">{event.max_attendees} people</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-900 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Location</h2>
            <div className="bg-gray-800 rounded-lg h-48 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm">Map coming soon</p>
              </div>
            </div>
          </div>
        </div>

        {/* Song Voting */}
        <SongVotingSection eventId={eventId} />
      </main>
    </div>
  )
}
