'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { warmBackend, startRun, pollRun, RunStatus, ItineraryResult } from '@/lib/api'
import PipelineProgress from '@/components/PipelineProgress'
import ItineraryCard from '@/components/ItineraryCard'
import SerendipityCard from '@/components/SerendipityCard'

type Phase = 'idle' | 'locating' | 'running' | 'done' | 'error'

const POLL_INTERVAL_MS = 1500
const GPS_TIMEOUT_MS = 10000

export default function PlannerPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('idle')
  const [runId, setRunId] = useState<string | null>(null)
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null)
  const [itinerary, setItinerary] = useState<ItineraryResult | null>(null)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const sessionIdRef = useRef<string>('')
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    warmBackend()
    const storedId = localStorage.getItem('session_id')
    if (storedId) {
      sessionIdRef.current = storedId
    } else {
      const newId = crypto.randomUUID()
      localStorage.setItem('session_id', newId)
      sessionIdRef.current = newId
    }
  }, [])

  // Cleanup poll timer on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current)
      }
    }
  }, [])

  const startPolling = useCallback((id: string) => {
    async function poll() {
      try {
        const status = await pollRun(id)
        setRunStatus(status)

        if (status.status === 'done') {
          setItinerary(status.result)
          setPhase('done')
          return
        }

        if (status.status === 'error') {
          setErrorMessage('Something went wrong building your plan. Please try again.')
          setPhase('error')
          return
        }

        // Still running — schedule next poll
        pollTimerRef.current = setTimeout(poll, POLL_INTERVAL_MS)
      } catch (err) {
        console.error('Poll error:', err)
        setErrorMessage('Lost connection to the server. Please try again.')
        setPhase('error')
      }
    }

    poll()
  }, [])

  async function launchRun(lat: number, lng: number) {
    try {
      setPhase('running')
      setLocationError(null)
      const id = await startRun(lat, lng, sessionIdRef.current)
      setRunId(id)
      startPolling(id)
    } catch (err) {
      console.error('Start run error:', err)
      setErrorMessage('Failed to start planning. Please try again.')
      setPhase('error')
    }
  }

  function requestGPS() {
    setPhase('locating')
    setLocationError(null)

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.')
      setPhase('idle')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        launchRun(position.coords.latitude, position.coords.longitude)
      },
      (err) => {
        console.error('GPS error:', err)
        let message = 'Could not get your location.'
        if (err.code === err.PERMISSION_DENIED) {
          message = 'Location access was denied. Enable it in your browser settings or use the demo.'
        } else if (err.code === err.TIMEOUT) {
          message = 'Location request timed out.'
        }
        setLocationError(message)
        setPhase('idle')
      },
      { timeout: GPS_TIMEOUT_MS, enableHighAccuracy: false }
    )
  }

  function useLisbonDemo() {
    // Lisbon coordinates
    launchRun(38.7169, -9.1399)
  }

  function handleStartOver() {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current)
    }
    setPhase('idle')
    setRunId(null)
    setRunStatus(null)
    setItinerary(null)
    setLocationError(null)
    setErrorMessage(null)
  }

  function goToOnboarding() {
    router.push('/onboarding')
  }

  // ─── Idle phase ───────────────────────────────────────────────────────────

  if (phase === 'idle') {
    return (
      <div className="flex flex-col min-h-screen bg-[#0a0a0a] px-4">
        {/* Hero section */}
        <div className="flex flex-col items-center justify-center flex-1 gap-6 py-12">
          {/* City skyline emoji effect */}
          <div className="text-center select-none" aria-hidden="true">
            <div className="text-4xl leading-relaxed opacity-30 tracking-widest">
              🏙️🌃🌆🌇🏙️
            </div>
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-1 tracking-tight">
              B Planner
            </h1>
            <p className="text-gray-400 text-lg">
              Your plan B, in 10 seconds.
            </p>
          </div>

          {/* Location error */}
          {locationError && (
            <div className="w-full bg-red-950/60 border border-red-800 rounded-xl px-4 py-3 text-red-300 text-sm text-center">
              {locationError}
            </div>
          )}

          {/* Main CTA */}
          <div className="w-full flex flex-col gap-3">
            <button
              onClick={requestGPS}
              className="w-full bg-amber-500 text-black font-bold py-4 rounded-2xl text-base hover:bg-amber-400 active:scale-95 transition-all duration-150 shadow-lg shadow-amber-500/20"
            >
              📍 Get My Plan
            </button>

            {locationError && (
              <button
                onClick={useLisbonDemo}
                className="w-full bg-gray-800 text-white font-semibold py-4 rounded-2xl text-base hover:bg-gray-700 active:scale-95 transition-all duration-150 border border-gray-700"
              >
                🌍 Use Lisbon (demo)
              </button>
            )}
          </div>

          {/* GPS note */}
          <p className="text-gray-600 text-xs text-center px-4">
            We&apos;ll ask for your location to find experiences near you.
            Your data is never stored.
          </p>
        </div>

        {/* Footer link to preferences */}
        <div className="pb-8 text-center">
          <button
            onClick={goToOnboarding}
            className="text-gray-600 text-sm hover:text-gray-400 transition-colors"
          >
            ⚙️ Update preferences
          </button>
        </div>
      </div>
    )
  }

  // ─── Locating phase ───────────────────────────────────────────────────────

  if (phase === 'locating') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] gap-4">
        <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-300 text-base font-medium">Finding your location...</p>
        <p className="text-gray-600 text-sm">Please allow location access</p>
      </div>
    )
  }

  // ─── Running phase ────────────────────────────────────────────────────────

  if (phase === 'running') {
    return (
      <div className="flex flex-col min-h-screen bg-[#0a0a0a] px-4 py-10">
        <div className="flex flex-col gap-8">
          {/* Header */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-1">Crafting your plan</h2>
            <p className="text-gray-400 text-sm">
              Hold tight, building your afternoon...
            </p>
          </div>

          {/* Pipeline progress */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
            <PipelineProgress steps={runStatus?.steps ?? []} />
          </div>

          {/* Ambient loading indicator */}
          <div className="flex justify-center">
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-amber-500/60"
                  style={{
                    animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── Error phase ──────────────────────────────────────────────────────────

  if (phase === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0a0a] px-4 gap-6">
        <div className="text-5xl">⚠️</div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-gray-400 text-sm">
            {errorMessage ?? 'An unexpected error occurred.'}
          </p>
        </div>
        <button
          onClick={handleStartOver}
          className="w-full bg-amber-500 text-black font-bold py-4 rounded-2xl text-base hover:bg-amber-400 active:scale-95 transition-all duration-150"
        >
          Try Again
        </button>
      </div>
    )
  }

  // ─── Done phase ───────────────────────────────────────────────────────────

  if (phase === 'done' && itinerary) {
    return (
      <div className="flex flex-col min-h-screen bg-[#0a0a0a] px-4 pb-10">
        {/* Itinerary header */}
        <div className="py-8 text-center">
          <p className="text-amber-400 text-sm font-medium uppercase tracking-widest mb-1">
            {itinerary.neighborhood}
          </p>
          <h2 className="text-3xl font-bold text-white">{itinerary.city_name}</h2>
          <p className="text-gray-500 text-sm mt-2">
            {itinerary.stops.length} stop{itinerary.stops.length !== 1 ? 's' : ''} · tailored for you
          </p>
        </div>

        {/* Stop cards */}
        <div className="flex flex-col gap-5">
          {itinerary.stops.map((stop, index) => (
            <ItineraryCard
              key={stop.productCode}
              stop={stop}
              index={index}
              showWalkTime={index < itinerary.stops.length - 1}
            />
          ))}

          {/* Serendipity pick */}
          {itinerary.serendipity_pick && (
            <div className="mt-2">
              <p className="text-gray-500 text-xs text-center mb-3 uppercase tracking-widest">
                Something unexpected
              </p>
              <SerendipityCard stop={itinerary.serendipity_pick} />
            </div>
          )}
        </div>

        {/* Start over button */}
        <div className="mt-8 flex flex-col gap-3">
          <button
            onClick={handleStartOver}
            className="w-full bg-gray-800 text-white font-semibold py-4 rounded-2xl text-base hover:bg-gray-700 active:scale-95 transition-all duration-150 border border-gray-700"
          >
            ↩ Start over
          </button>
          <button
            onClick={goToOnboarding}
            className="text-gray-600 text-sm text-center hover:text-gray-400 transition-colors py-2"
          >
            ⚙️ Update preferences
          </button>
        </div>
      </div>
    )
  }

  // Fallback (shouldn't reach here in normal flow)
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
      <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}
