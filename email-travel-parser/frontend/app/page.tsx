'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { API_URL } from '@/lib/api'

type ScanStep = { step: string; msg: string; current?: number; total?: number }
type Preference = { count: number; intensity: string }
type CityVisit = { name: string; visits: string[] }
type CountryVisit = { name: string; code: string; cities: CityVisit[] }
type Profile = {
  email_count?: number
  preferences?: Record<string, Preference>
  countries_visited?: CountryVisit[]
}
type MeResponse = {
  connected: boolean
  user_email: string | null
  profile: Profile | null
  default_from: string
  default_to: string
}

const STEP_ORDER = ['auth', 'fetching', 'parsing', 'profiling', 'saving', 'done']

function flagEmoji(code: string) {
  return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}

export default function DashboardPage() {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [steps, setSteps] = useState<ScanStep[]>([])
  const [currentStep, setCurrentStep] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [scanError, setScanError] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/api/me`, { credentials: 'include' })
      .then(r => r.json())
      .then((data: MeResponse) => {
        setMe(data)
        setFromDate(data.default_from)
        setToDate(data.default_to)
      })
      .finally(() => setLoading(false))
  }, [])

  function startScan() {
    setScanning(true)
    setSteps([])
    setCurrentStep('')
    setScanError('')

    const url = `${API_URL}/scan/stream?from_date=${fromDate}&to_date=${toDate}`
    const es = new EventSource(url, { withCredentials: true })

    es.onmessage = e => {
      const event: ScanStep = JSON.parse(e.data)
      setSteps(prev => [...prev, event])
      setCurrentStep(event.step)
      if (event.step === 'done') {
        es.close()
        setScanning(false)
        setTimeout(() => { window.location.href = '/scan' }, 600)
      }
      if (event.step === 'error') {
        es.close()
        setScanning(false)
        setScanError(event.msg)
      }
    }
    es.onerror = () => {
      es.close()
      setScanning(false)
      setScanError('Connection lost. Please try again.')
    }
  }

  /* ── Loading ──────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--text-accent)', opacity: 0.4,
              animation: `fadeIn 0.6s ease ${i * 0.15}s both`,
            }} />
          ))}
        </div>
      </div>
    )
  }

  /* ── Not connected ─────────────────────────────────────────────── */
  if (!me?.connected) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 1.5rem 3rem' }}>
        <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>

          <div className="fade-up" style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-accent)', fontWeight: 600 }}>
              Travel Intelligence
            </span>
          </div>

          <h1 className="fade-up d-100" style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.8rem, 7vw, 5rem)',
            fontWeight: 600,
            lineHeight: 1.1,
            color: 'var(--text)',
            marginBottom: '1.25rem',
            letterSpacing: '-0.02em',
          }}>
            Uncover Your<br />
            <span style={{ color: 'var(--text-accent)' }}>Travel DNA</span>
          </h1>

          <p className="fade-up d-200" style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: '2.5rem', lineHeight: 1.7 }}>
            Connect your Gmail inbox. We scan your booking history locally
            and build a rich preference profile — email bodies never leave your device.
          </p>

          <div className="fade-up d-300">
            <a href={`${API_URL}/auth`} className="btn btn-primary" style={{ fontSize: '0.95rem', padding: '0.75rem 1.75rem' }}>
              Connect Gmail
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>

          {/* Trust badge */}
          <div className="fade-up d-400 glass-subtle" style={{
            marginTop: '3rem',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            textAlign: 'left',
          }}>
            <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>🔒</span>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.2rem' }}>Privacy-first by design</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Email bodies are processed locally via msgvault. Only metadata and preference signals reach the cloud.
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── Connected ─────────────────────────────────────────────────── */
  const profile = me.profile
  const INTENSITY_ORDER: Record<string, number> = { strong: 0, moderate: 1, weak: 2 }
  const prefs = profile?.preferences
    ? Object.entries(profile.preferences as Record<string, Preference>).sort(
        ([, a], [, b]) => (INTENSITY_ORDER[a.intensity] ?? 3) - (INTENSITY_ORDER[b.intensity] ?? 3)
      )
    : []
  const countries = profile?.countries_visited ?? []

  return (
    <div style={{ minHeight: '100vh', padding: '88px 1.5rem 4rem', maxWidth: 680, margin: '0 auto' }}>

      {/* Header row */}
      <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            Your Profile
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{me.user_email}</p>
        </div>
        <a href={`${API_URL}/disconnect`} className="btn btn-ghost" style={{ fontSize: '0.78rem' }}>
          Disconnect
        </a>
      </div>

      {/* Scan card */}
      <div className="fade-up d-100 glass" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: scanning ? 'var(--text-accent)' : 'var(--text-muted)', transition: 'background 300ms', display: 'inline-block',
            boxShadow: scanning ? 'var(--glow-teal)' : 'none',
            animation: scanning ? 'glowPulse 1.5s ease infinite' : 'none',
          }} />
          <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', margin: 0, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
            {scanning ? 'Scanning...' : 'Scan Emails'}
          </h2>
        </div>

        {/* Date range + trigger */}
        {!scanning && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 130 }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>From</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input" />
            </div>
            <div style={{ flex: 1, minWidth: 130 }}>
              <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>To</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input" />
            </div>
            <button onClick={startScan} className="btn btn-primary" style={{ flexShrink: 0 }}>
              Scan
            </button>
          </div>
        )}

        {/* Progress steps */}
        {scanning && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {STEP_ORDER.map((step, i) => {
              const done = steps.some(s => s.step === step)
              const active = currentStep === step
              const msg = steps.findLast(s => s.step === step)?.msg
              return (
                <div key={step} className={done ? 'fade-in' : ''} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: done || active ? 1 : 0.3, transition: 'opacity 300ms' }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: done ? 'var(--text-accent)' : active ? 'var(--text-accent)' : 'var(--text-muted)',
                    boxShadow: active ? 'var(--glow-teal)' : 'none',
                  }} />
                  <span style={{ fontSize: '0.82rem', color: done ? 'var(--text)' : 'var(--text-muted)' }}>
                    {msg ?? step}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {scanError && (
          <p style={{ marginTop: '1rem', fontSize: '0.82rem', color: '#f87171', background: 'rgba(248,113,113,0.08)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
            {scanError}
          </p>
        )}
      </div>

      {/* Stats */}
      {profile && (
        <>
          <div className="fade-up d-200" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Emails',       value: profile.email_count ?? 0 },
              { label: 'Countries', value: countries.length },
              { label: 'Preferences',  value: prefs.length },
            ].map(({ label, value }) => (
              <div key={label} className="glass-subtle" style={{ borderRadius: 'var(--radius-lg)', padding: '1.1rem', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Preference bars */}
          {prefs.length > 0 && (
            <div className="fade-up d-300 glass" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
                Activity Preferences
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                {prefs.map(([activity, data], i) => (
                  <div key={activity} className={`fade-in d-${Math.min(i + 1, 6) * 100 as 100 | 200 | 300 | 400 | 500 | 600}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text)', width: 150, flexShrink: 0, textTransform: 'capitalize' }}>
                      {activity.replace(/_/g, ' ')}
                    </span>
                    <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        borderRadius: 2,
                        background: 'linear-gradient(90deg, #00d4aa, #00a884)',
                        width: data.intensity === 'strong' ? '100%' : data.intensity === 'moderate' ? '62%' : '32%',
                        transition: 'width 0.6s ease',
                        boxShadow: '0 0 8px rgba(0,212,170,0.4)',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', width: 60, textAlign: 'right', letterSpacing: '0.03em' }}>
                      {data.intensity}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <Link href="/scan" style={{ fontSize: '0.8rem', color: 'var(--text-accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  View full results
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2.5 6h7M6 2.5l3.5 3.5L6 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </Link>
              </div>
            </div>
          )}
        </>
      )}

      {/* Countries visited */}
      {countries.length > 0 && (
        <div className="fade-up d-400" style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
            Countries Visited
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.875rem' }}>
            {countries.map((country, i) => (
              <div
                key={country.name}
                className={`fade-up d-${Math.min(i + 1, 6) * 100 as 100|200|300|400|500|600} glass-subtle`}
                style={{ borderRadius: 'var(--radius-lg)', padding: '1.1rem 1.25rem', border: '1px solid var(--border)', transition: 'border-color 200ms' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-accent)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
              >
                <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span aria-hidden="true">{flagEmoji(country.code)}</span>
                  {country.name}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {country.cities.map(city => (
                    <div key={city.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{city.name}</span>
                      {city.visits.length > 0 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                          {city.visits.join(' · ')}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!profile && !scanning && (
        <div className="fade-up d-200 glass-subtle" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✈️</div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Run your first scan to build your travel profile.</p>
        </div>
      )}
    </div>
  )
}
