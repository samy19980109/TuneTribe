'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SongNomination } from '@/lib/types'
import { usePlayerStore } from '@/stores/usePlayerStore'
import SwipeCard from './SwipeCard'

const supabase = createClient()
const THRESHOLD = 100

interface SwipeCardDeckProps {
  nominations: SongNomination[]
  userId: string
  onVoteCast: () => void
}

export default function SwipeCardDeck({ nominations, userId, onVoteCast }: SwipeCardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [deltaX, setDeltaX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const { playPreview, stopPreview } = usePlayerStore()

  // Reset index when nominations array changes (e.g. after re-fetch removes voted songs)
  useEffect(() => {
    setCurrentIndex(0)
  }, [nominations])

  const currentNom = nominations[currentIndex] || null
  const nextNom = nominations[currentIndex + 1] || null

  const castVote = useCallback(async (nomination: SongNomination, vote: 1 | -1) => {
    // Insert vote
    await supabase
      .from('event_song_votes')
      .upsert({
        nomination_id: nomination.id,
        user_id: userId,
        vote,
      })

    // Update vote count (only increment for likes)
    if (vote === 1) {
      await supabase
        .from('event_song_nominations')
        .update({ vote_count: nomination.vote_count + 1 })
        .eq('id', nomination.id)
    }

    onVoteCast()
  }, [userId, onVoteCast])

  const handleSwipeComplete = useCallback((direction: 'left' | 'right') => {
    if (!currentNom || isAnimating) return

    setIsAnimating(true)
    const flyX = direction === 'right' ? window.innerWidth + 200 : -(window.innerWidth + 200)
    setDeltaX(flyX)

    stopPreview()

    setTimeout(() => {
      const vote = direction === 'right' ? 1 : -1
      castVote(currentNom, vote as 1 | -1)
      setCurrentIndex(prev => prev + 1)
      setDeltaX(0)
      setIsAnimating(false)
    }, 300)
  }, [currentNom, isAnimating, castVote, stopPreview])

  // Pointer events
  const onPointerDown = (e: React.PointerEvent) => {
    if (isAnimating) return
    setIsDragging(true)
    setStartX(e.clientX)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    setDeltaX(e.clientX - startX)
  }

  const onPointerUp = () => {
    if (!isDragging) return
    setIsDragging(false)

    if (Math.abs(deltaX) > THRESHOLD) {
      handleSwipeComplete(deltaX > 0 ? 'right' : 'left')
    } else {
      setDeltaX(0)
    }
  }

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleSwipeComplete('right')
      else if (e.key === 'ArrowLeft') handleSwipeComplete('left')
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSwipeComplete])

  // All cards voted on
  if (!currentNom) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-[#1DB954]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-gray-400 font-medium mb-1">All caught up!</p>
        <p className="text-gray-600 text-sm">You&apos;ve voted on all nominated songs.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Card deck */}
      <div
        className="relative w-full max-w-sm mx-auto aspect-[3/4] select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* Next card (behind) */}
        {nextNom && (
          <SwipeCard
            nomination={nextNom}
            deltaX={0}
            isDragging={false}
            isTop={false}
            onPlayPreview={() => {}}
          />
        )}

        {/* Current card (top) */}
        <SwipeCard
          nomination={currentNom}
          deltaX={deltaX}
          isDragging={isDragging}
          isTop={true}
          onPlayPreview={() => {
            if (currentNom.preview_url) playPreview(currentNom.preview_url)
          }}
        />
      </div>

      {/* Action buttons */}
      <div className="flex justify-center gap-6 mt-6">
        <button
          onClick={() => handleSwipeComplete('left')}
          disabled={isAnimating}
          className="w-14 h-14 rounded-full border-2 border-red-500/30 flex items-center justify-center hover:bg-red-500/10 transition-colors disabled:opacity-50"
        >
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button
          onClick={() => handleSwipeComplete('right')}
          disabled={isAnimating}
          className="w-14 h-14 rounded-full border-2 border-[#1DB954]/30 flex items-center justify-center hover:bg-[#1DB954]/10 transition-colors disabled:opacity-50"
        >
          <svg className="w-6 h-6 text-[#1DB954]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </button>
      </div>

      {/* Hint */}
      <p className="text-center text-xs text-gray-600 mt-3">
        Swipe right to like, left to skip &middot; or use arrow keys
      </p>
    </div>
  )
}
