'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { API_URL } from '@/lib/api'

type Experience = { category: string; examples: string[] }
type Trip = {
  id: string
  city: string
  start_date: string | null
  end_date: string | null
  label: string | null
  email_count: number
  experiences: Experience[]
}
type CountryData = {
  country: { name: string; code: string }
  trips: Trip[]
}

const CATEGORY_META: Record<string, { label: string; icon: string }> = {
  food_dining:       { label: 'Food & Dining',   icon: '🍽' },
  culture_history:   { label: 'Culture',          icon: '🏛' },
  adventure_outdoor: { label: 'Outdoor',           icon: '🧗' },
  nightlife:         { label: 'Nightlife',         icon: '🌙' },
  wellness:          { label: 'Wellness',          icon: '🧘' },
  sightseeing:       { label: 'Sightseeing',       icon: '🗺' },
  accommodation:     { label: 'Accommodation',     icon: '🏨' },
  transportation:    { label: 'Transportation',    icon: '✈️' },
  cuisine:           { label: 'Cuisine',           icon: '🌮' },
}

function flagEmoji(code: string) {
  return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}

export default function CountryPageClient() {
  const { code } = useParams<{ code: string }>()
  const [data, setData]       = useState<CountryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  useEffect(() => {
    fetch(`${API_URL}/api/experiences/${code}`, { credentials: 'include' })
      .then(r => {
        if (r.status === 401) { window.location.href = '/'; return null }
        if (r.status === 404) { setError('No trips found for this country.'); return null }
        return r.json()
      })
      .then(d => { if (d) setData(d) })
      .catch(() => setError('Failed to load.'))
      .finally(() => setLoading(false))
  }, [code])

  if (loading) {
    return (
      <div style={{ padding: '88px 1.5rem 4rem', maxWidth: 720, margin: '0 auto' }}>
        <div style={{ height: 24, width: 80, marginBottom: '2rem' }} className="skeleton" />
        <div style={{ height: 44, width: '50%', marginBottom: '2.5rem' }} className="skeleton" />
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ height: 140, marginBottom: '1rem' }} className="skeleton" />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ padding: '88px 1.5rem', maxWidth: 720, margin: '0 auto' }}>
        <Link href="/" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none' }}>← Back</Link>
        <p style={{ marginTop: '2rem', color: '#f87171', fontSize: '0.9rem' }}>{error || 'Not found.'}</p>
      </div>
    )
  }

  const { country, trips } = data

  return (
    <div style={{ padding: '88px 1.5rem 4rem', maxWidth: 720, margin: '0 auto' }}>

      {/* Header */}
      <div className="fade-up" style={{ marginBottom: '2rem' }}>
        <Link href="/" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.875rem' }}>
          ← Profile
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.15, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span aria-hidden="true">{flagEmoji(country.code)}</span>
          {country.name}
        </h1>
        <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
        </p>
      </div>

      {/* Trip cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {trips.map((trip, i) => (
          <div
            key={trip.id}
            className={`fade-up d-${Math.min(i + 1, 6) * 100 as 100|200|300|400|500|600} glass`}
            style={{ borderRadius: 'var(--radius-xl)', padding: '1.25rem 1.5rem' }}
          >
            {/* Trip header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                  {trip.city}
                </h2>
                {trip.label && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                    {trip.label}
                  </span>
                )}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.2rem 0.6rem', flexShrink: 0 }}>
                {trip.email_count} {trip.email_count === 1 ? 'email' : 'emails'}
              </span>
            </div>

            {/* Experiences */}
            {trip.experiences.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {trip.experiences.map(exp => {
                  const meta = CATEGORY_META[exp.category] ?? { label: exp.category.replace(/_/g, ' '), icon: '•' }
                  return (
                    <div key={exp.category}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.85rem' }}>{meta.icon}</span>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize', letterSpacing: '0.02em' }}>
                          {meta.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingLeft: '1.35rem' }}>
                        {exp.examples.map((ex, j) => (
                          <span key={j} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ex}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>No experiences detected for this trip.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
