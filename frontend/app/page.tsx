'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { warmBackend } from '@/lib/api'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Warm backend in background
    warmBackend()

    // Ensure session_id exists
    let sessionId = localStorage.getItem('session_id')
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      localStorage.setItem('session_id', sessionId)
    }

    // Check if preferences have been set
    const preferencesSet = localStorage.getItem('preferences_set')
    if (!preferencesSet || preferencesSet === 'false') {
      router.push('/onboarding')
    } else {
      router.push('/planner')
    }
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    </div>
  )
}
