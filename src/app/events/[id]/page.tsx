'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { Event, Profile } from '@/lib/types'

function Header({ user, onLogout }: { user: any, onLogout: () => void }) {
  return (
    <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <Link href="/" className="text-xl font-bold">TuneTribe</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/events/new"
              className="text-sm bg-[#1DB954] hover:bg-[#1ed760] text-black px-3 py-1.5 rounded-lg font-medium"
            >
              Create Event
            </Link>
            <Link href="/profile" className="text-gray-400 hover:text-white">
              <div className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center text-sm font-bold text-black">
                {user?.email?.[0]?.toUpperCase() || '?'}
              </div>
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

export default function EventDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const eventId = params.id as string

  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [rsvpStatus, setRsvpStatus] = useState<'going' | 'maybe' | 'not_going'>('going')
  const [user, setUser] = useState<any>(null)
  const [isAttending, setIsAttending] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      const { data: eventData } = await supabase
        .from('events')
        .select('*, city:cities(*), genre:genres(*), organizer:profiles(*)')
        .eq('id', eventId)
        .single()

      setEvent(eventData)

      if (user && eventData) {
        const { data: attendee } = await supabase
          .from('event_attendees')
          .select('*')
          .eq('event_id', eventId)
          .eq('user_id', user.id)
          .single()

        if (attendee) {
          setIsAttending(true)
          setRsvpStatus(attendee.rsvp_status)
        }
      }

      setLoading(false)
    }
    init()
  }, [eventId])

  const handleRSVP = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    if (isAttending) {
      await supabase
        .from('event_attendees')
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id)
      setIsAttending(false)
    } else {
      await supabase
        .from('event_attendees')
        .insert({
          event_id: eventId,
          user_id: user.id,
          rsvp_status: rsvpStatus,
        })
      setIsAttending(true)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
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
      <Header user={user} onLogout={handleLogout} />

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
              <svg className="w-20 h-20 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
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
      </main>
    </div>
  )
}
