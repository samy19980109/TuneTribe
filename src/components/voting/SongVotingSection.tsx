'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { SongNomination } from '@/lib/types'
import { useAuthStore } from '@/stores/useAuthStore'
import { usePlayerStore } from '@/stores/usePlayerStore'
import SongSearch from './SongSearch'
import SwipeCardDeck from './SwipeCardDeck'
import SongLeaderboard from './SongLeaderboard'

const supabase = createClient()

type Tab = 'nominate' | 'vote' | 'leaderboard'

interface SongVotingSectionProps {
  eventId: string
}

export default function SongVotingSection({ eventId }: SongVotingSectionProps) {
  const { user } = useAuthStore()
  const { playPreview } = usePlayerStore()
  const [activeTab, setActiveTab] = useState<Tab>('leaderboard')
  const [nominations, setNominations] = useState<SongNomination[]>([])
  const [unvoted, setUnvoted] = useState<SongNomination[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const triggerRefresh = useCallback(() => {
    setRefreshKey(k => k + 1)
  }, [])

  // Fetch nominations
  useEffect(() => {
    const fetchNominations = async () => {
      const { data: noms } = await supabase
        .from('event_song_nominations')
        .select('*')
        .eq('event_id', eventId)
        .order('vote_count', { ascending: false })

      const allNoms: SongNomination[] = noms || []
      setNominations(allNoms)

      if (user) {
        const { data: votes } = await supabase
          .from('event_song_votes')
          .select('nomination_id')
          .eq('user_id', user.id)

        const votedIds = new Set((votes || []).map(v => v.nomination_id))
        setUnvoted(allNoms.filter(n => !votedIds.has(n.id)))
      } else {
        setUnvoted([])
      }

      setLoading(false)
    }

    fetchNominations()
  }, [eventId, user, refreshKey])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
    if (tab === 'leaderboard') {
      triggerRefresh()
    }
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'leaderboard', label: 'Leaderboard', count: nominations.length },
    { key: 'vote', label: 'Vote', count: unvoted.length },
    { key: 'nominate', label: 'Nominate' },
  ]

  // Not signed in
  if (!user) {
    return (
      <section className="mt-10">
        <div className="border border-white/[0.06] rounded-2xl p-8 text-center bg-white/[0.01]">
          <h3 className="text-lg font-semibold mb-2">Song Voting</h3>
          <p className="text-gray-500 text-sm mb-5">
            Sign in to nominate songs and vote on what gets played at this event.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-white text-black font-semibold px-5 py-2.5 rounded-full hover:bg-gray-100 transition-colors text-sm"
          >
            Sign in to participate
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section className="mt-10">
      {/* Section header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold tracking-tight mb-1">Song Pool</h2>
        <p className="text-sm text-gray-500">
          Nominate songs and vote on what gets played. The community decides the setlist.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white/[0.08] text-white'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key
                  ? 'bg-[#1DB954] text-black font-bold'
                  : 'bg-white/5 text-gray-500'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-gray-700 border-t-gray-400 rounded-full animate-spin mx-auto" />
        </div>
      ) : (
        <>
          {activeTab === 'leaderboard' && (
            <SongLeaderboard
              nominations={nominations}
              onPlayPreview={playPreview}
            />
          )}

          {activeTab === 'vote' && (
            <SwipeCardDeck
              nominations={unvoted}
              userId={user.id}
              onVoteCast={triggerRefresh}
            />
          )}

          {activeTab === 'nominate' && (
            <SongSearch
              eventId={eventId}
              userId={user.id}
              onNominated={triggerRefresh}
            />
          )}
        </>
      )}
    </section>
  )
}
