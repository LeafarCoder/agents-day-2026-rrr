'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase'

const CATEGORIES = [
  { id: 'food_drink', label: 'Food & Drink', emoji: '🍷' },
  { id: 'outdoor_hiking', label: 'Outdoor & Hiking', emoji: '🥾' },
  { id: 'history_culture', label: 'History & Culture', emoji: '🏛️' },
  { id: 'walking_tours', label: 'Walking Tours', emoji: '🚶' },
  { id: 'nightlife', label: 'Nightlife', emoji: '🌙' },
  { id: 'art_museums', label: 'Art & Museums', emoji: '🎨' },
  { id: 'water_sports', label: 'Water Sports', emoji: '🌊' },
  { id: 'family_kids', label: 'Family & Kids', emoji: '👨‍👩‍👧' },
]

const DEFAULT_CATEGORIES = ['food_drink', 'history_culture', 'walking_tours']

export default function OnboardingPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleCategory(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  async function savePreferences(categories: string[]) {
    setSaving(true)
    setError(null)

    try {
      const sessionId = localStorage.getItem('session_id') ?? crypto.randomUUID()
      localStorage.setItem('session_id', sessionId)

      const { error: supabaseError } = await getSupabase()
        .from('user_preferences')
        .upsert(
          { session_id: sessionId, categories },
          { onConflict: 'session_id' }
        )

      if (supabaseError) {
        console.error('Supabase error:', supabaseError)
        // Don't block the user — still proceed
      }

      localStorage.setItem('preferences_set', 'true')
      router.push('/planner')
    } catch (err) {
      console.error('Save error:', err)
      setError('Failed to save preferences. Please try again.')
      setSaving(false)
    }
  }

  async function handleSave() {
    await savePreferences(Array.from(selected))
  }

  async function handleSkip() {
    await savePreferences(DEFAULT_CATEGORIES)
  }

  const canSave = selected.size >= 1

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a] px-4 py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-white mb-2">What do you love?</h1>
        <p className="text-gray-400 text-base">
          We&apos;ll find experiences that match your taste.
        </p>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-2 gap-3 mb-6 flex-1">
        {CATEGORIES.map((cat) => {
          const isSelected = selected.has(cat.id)
          return (
            <button
              key={cat.id}
              onClick={() => toggleCategory(cat.id)}
              className={`
                flex flex-col items-center justify-center gap-2 p-4 rounded-2xl
                border-2 transition-all duration-150 text-center
                ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 text-white'
                    : 'border-gray-800 bg-gray-900 text-gray-300 hover:border-gray-600'
                }
              `}
              aria-pressed={isSelected}
            >
              <span className="text-3xl leading-none">{cat.emoji}</span>
              <span className="text-sm font-medium leading-tight">{cat.label}</span>
            </button>
          )
        })}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-red-400 text-sm text-center mb-4">{error}</p>
      )}

      {/* Save button */}
      <div className="mt-auto flex flex-col gap-3 pb-4">
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          className={`
            w-full py-4 rounded-2xl font-semibold text-base transition-all duration-150
            ${
              canSave && !saving
                ? 'bg-amber-500 text-black hover:bg-amber-400 active:scale-95'
                : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            'Save & Explore'
          )}
        </button>

        <button
          onClick={handleSkip}
          disabled={saving}
          className="text-gray-500 text-sm text-center hover:text-gray-300 transition-colors py-2"
        >
          Skip — use defaults
        </button>
      </div>
    </div>
  )
}
