'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { API_URL } from '@/lib/api'

const WorldMap = dynamic(() => import('./components/WorldMap'), { ssr: false })

type ScanStep = { step: string; msg: string; current?: number; total?: number }
type KeywordPref = { keyword: string; count: number }
type Preference = { total: number; keywords: KeywordPref[] }
type CityVisit = { name: string; visits: string[] }
type CountryVisit = { name: string; code: string; cities: CityVisit[] }
type TripExperience = { category: string; examples: string[] }
type TripData = { city: string; label: string | null; experiences: TripExperience[] }

const CATEGORY_LABEL: Record<string, string> = {
  food_dining: 'Food & Dining', culture_history: 'Culture', adventure_outdoor: 'Outdoor',
  nightlife: 'Nightlife', wellness: 'Wellness', sightseeing: 'Sightseeing',
  accommodation: 'Accommodation', transportation: 'Transportation', cuisine: 'Cuisine',
}
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
  const [selectedCity, setSelectedCity] = useState<{ countryCode: string; cityName: string } | null>(null)
  const [expCache, setExpCache] = useState<Record<string, TripData[]>>({})
  const [expLoading, setExpLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [emailsExpanded, setEmailsExpanded] = useState(false)
  const [excludeFilters, setExcludeFilters] = useState({
    promotions: true,
    spam:       true,
    social:     true,
    forums:     true,
  })
  const [openPrefs, setOpenPrefs] = useState<Set<string>>(new Set())

  async function deleteAllData() {
    if (!confirm('Delete all your data? This cannot be undone.')) return
    setDeleting(true)
    try {
      await fetch(`${API_URL}/api/me`, { method: 'DELETE', credentials: 'include' })
      window.location.href = '/'
    } finally {
      setDeleting(false)
    }
  }

  async function selectCity(countryCode: string, cityName: string) {
    const key = `${countryCode}:${cityName}`
    if (selectedCity?.countryCode === countryCode && selectedCity?.cityName === cityName) {
      setSelectedCity(null)
      return
    }
    setSelectedCity({ countryCode, cityName })
    if (expCache[key]) return
    setExpLoading(true)
    try {
      const r = await fetch(`${API_URL}/api/experiences/${countryCode}`, { credentials: 'include' })
      if (r.ok) {
        const d = await r.json()
        const entries: Record<string, TripData[]> = {}
        for (const trip of (d.trips ?? []) as TripData[]) {
          const k = `${countryCode}:${trip.city}`
          entries[k] = [...(entries[k] ?? []), trip]
        }
        setExpCache(prev => ({ ...prev, ...entries }))
      }
    } finally {
      setExpLoading(false)
    }
  }

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

  function setDatePreset(months: number) {
    const today = new Date()
    const from  = new Date(today)
    from.setMonth(from.getMonth() - months)
    setFromDate(from.toISOString().split('T')[0])
    setToDate(today.toISOString().split('T')[0])
  }

  function startScan() {
    setScanning(true)
    setSteps([])
    setCurrentStep('')
    setScanError('')
    setEmailsExpanded(false)

    const excludeParams = (Object.keys(excludeFilters) as (keyof typeof excludeFilters)[])
      .filter(k => excludeFilters[k])
      .map(k => `exclude=${k}`)
      .join('&')
    const url = `${API_URL}/scan/stream?from_date=${fromDate}&to_date=${toDate}${excludeParams ? '&' + excludeParams : ''}`
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
  const prefs = profile?.preferences
    ? Object.entries(profile.preferences as Record<string, Preference>).sort(
        ([, a], [, b]) => b.total - a.total
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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={deleteAllData} disabled={deleting} className="btn btn-ghost" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {deleting ? 'Deleting...' : 'Delete all data'}
          </button>
          <a href={`${API_URL}/disconnect`} className="btn btn-ghost" style={{ fontSize: '0.78rem' }}>
            Disconnect
          </a>
        </div>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            {/* Quick presets */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {([['1 month', 1], ['3 months', 3], ['1 year', 12], ['5 years', 60], ['10 years', 120]] as [string, number][]).map(([label, months]) => (
                <button key={label} onClick={() => setDatePreset(months)} className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}>
                  {label}
                </button>
              ))}
            </div>

            {/* Date pickers */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 130 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>From</label>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input" />
              </div>
              <div style={{ flex: 1, minWidth: 130 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>To</label>
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input" />
              </div>
            </div>

            {/* Scan button — right-aligned below dates */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={startScan} className="btn btn-primary">
                Scan Emails
              </button>
            </div>

            {/* Advanced options toggle */}
            <button
              onClick={() => setShowAdvanced(v => !v)}
              style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: 0 }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: showAdvanced ? 'rotate(90deg)' : 'none', transition: 'transform 200ms' }}>
                <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Advanced filters
            </button>

            {/* Advanced options panel */}
            {showAdvanced && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 0.25rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Exclude Gmail categories</p>
                {([
                  ['promotions', 'Promotions'],
                  ['spam',       'Spam'],
                  ['social',     'Social'],
                  ['forums',     'Forums'],
                ] as [keyof typeof excludeFilters, string][]).map(([key, label]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text)' }}>
                    <input
                      type="checkbox"
                      checked={excludeFilters[key]}
                      onChange={e => setExcludeFilters(prev => ({ ...prev, [key]: e.target.checked }))}
                      style={{ accentColor: 'var(--text-accent)', width: 14, height: 14 }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Progress steps */}
        {scanning && (() => {
          const parsingEmails = steps.filter(s => s.step === 'parsing')
          const latestParsing = parsingEmails[parsingEmails.length - 1]
          const parsingActive = currentStep === 'parsing'
          const parsingStarted = parsingEmails.length > 0
          const currentN = latestParsing?.current ?? 0
          const totalN = latestParsing?.total ?? 0

          const getSubject = (msg: string) => {
            const m = msg.match(/^Scanning \d+\/\d+: (.+)$/)
            return m ? m[1] : msg
          }

          const collapsedLabel = parsingActive && latestParsing
            ? `Email ${currentN} of ${totalN} — ${getSubject(latestParsing.msg)}`
            : parsingStarted
              ? `Processed ${totalN} emails`
              : 'Processing emails'

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {STEP_ORDER.map(step => {
                if (step === 'parsing') {
                  return (
                    <div key="parsing" style={{ opacity: parsingStarted || parsingActive ? 1 : 0.3, transition: 'opacity 300ms' }}>
                      <button
                        onClick={() => parsingStarted && setEmailsExpanded(v => !v)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          background: 'none', border: 'none',
                          cursor: parsingStarted ? 'pointer' : 'default',
                          padding: 0, width: '100%', textAlign: 'left',
                        }}
                      >
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                          background: parsingStarted ? 'var(--text-accent)' : 'var(--text-muted)',
                          boxShadow: parsingActive ? 'var(--glow-teal)' : 'none',
                          animation: parsingActive ? 'glowPulse 1.5s ease infinite' : 'none',
                        }} />
                        <span style={{
                          fontSize: '0.82rem',
                          color: parsingStarted ? 'var(--text)' : 'var(--text-muted)',
                          flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {collapsedLabel}
                        </span>
                        {parsingStarted && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                            style={{ transform: emailsExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 200ms', flexShrink: 0, opacity: 0.5 }}
                          >
                            <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>

                      {emailsExpanded && parsingEmails.length > 0 && (
                        <div style={{
                          marginTop: '0.5rem', marginLeft: '1.5rem',
                          maxHeight: 180, overflowY: 'auto',
                          background: 'rgba(255,255,255,0.03)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          padding: '0.35rem 0',
                        }}>
                          {parsingEmails.map((email, i) => {
                            const isActive = i === parsingEmails.length - 1 && parsingActive
                            const subject = getSubject(email.msg)
                            const isSkipped = subject === 'skipped' || subject === 'error'
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.22rem 0.75rem' }}>
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', width: 28, textAlign: 'right', flexShrink: 0 }}>
                                  {email.current ?? i + 1}
                                </span>
                                {isActive ? (
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-accent)', animation: 'glowPulse 1.5s ease infinite', flexShrink: 0, display: 'inline-block' }} />
                                ) : isSkipped ? (
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.3 }}>
                                    <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                  </svg>
                                ) : (
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                                    <path d="M2 6.5l2.5 2.5 5.5-5.5" stroke="var(--text-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                )}
                                <span style={{
                                  fontSize: '0.75rem', color: 'var(--text)',
                                  flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                  opacity: isSkipped ? 0.35 : 1,
                                }}>
                                  {subject}
                                </span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                }

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
          )
        })()}

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

          {/* Preference drilldown */}
          {prefs.length > 0 && (
            <div className="fade-up d-300 glass" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
                Activity Preferences
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {prefs.map(([category, data], i) => {
                  const isOpen = openPrefs.has(category)
                  const toggle = () => setOpenPrefs(prev => {
                    const next = new Set(prev)
                    isOpen ? next.delete(category) : next.add(category)
                    return next
                  })
                  return (
                    <div key={category} className={`fade-in d-${Math.min(i + 1, 6) * 100 as 100 | 200 | 300 | 400 | 500 | 600}`}
                      style={{ borderBottom: '1px solid var(--border)' }}>
                      <button
                        onClick={toggle}
                        style={{
                          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '0.7rem 0', background: 'none', border: 'none', cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>
                          {category.replace(/_/g, ' ')}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                            {data.total}
                          </span>
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"
                            style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
                            <path d="M1.5 3.5l3.5 3 3.5-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      </button>
                      {isOpen && (
                        <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '0.6rem' }}>
                          {[...data.keywords].sort((a, b) => b.count - a.count).map(kw => (
                            <div key={kw.keyword} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                              padding: '0.2rem 0.4rem', margin: '0 -0.4rem',
                              borderRadius: 'var(--radius-sm)',
                            }}>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{kw.keyword}</span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{kw.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
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

      {/* World map */}
      {countries.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <WorldMap countries={countries} onCitySelect={selectCity} />
        </div>
      )}

      {/* Places visited cards */}
      {countries.length > 0 && (
        <div className="fade-up d-400" style={{ marginTop: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
              Places Visited
            </h2>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.25rem 0 0', opacity: 0.6 }}>
              Click a city to view trip details
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.875rem' }}>
            {countries.map((country, i) => (
              <div
                key={country.name}
                className={`fade-up d-${Math.min(i + 1, 6) * 100 as 100|200|300|400|500|600} glass-subtle`}
                style={{ borderRadius: 'var(--radius-lg)', padding: '1.1rem 1.25rem', border: '1px solid var(--border)' }}
              >
                <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span aria-hidden="true">{flagEmoji(country.code)}</span>
                  {country.name}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  {country.cities.map(city => (
                    <div
                      key={city.name}
                      className="city-row"
                      onClick={() => selectCity(country.code, city.name)}
                      style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem',
                        padding: '0.4rem 0.6rem', margin: '0 -0.6rem',
                      }}
                    >
                      <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{city.name}</span>
                      {city.visits.length > 0 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                          {city.visits[0]}
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

      {/* Experiences popup */}
      {selectedCity && (
        <div
          onClick={() => setSelectedCity(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="glass fade-in"
            style={{
              borderRadius: 'var(--radius-xl)', padding: '1.75rem',
              width: '100%', maxWidth: 420,
              border: '1px solid var(--border)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {flagEmoji(selectedCity.countryCode)} {countries.find(c => c.code === selectedCity.countryCode)?.name}
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                {selectedCity.cityName}
              </h2>
            </div>

            {/* Experiences */}
            {(() => {
              const trips = expCache[`${selectedCity.countryCode}:${selectedCity.cityName}`]
              if (expLoading && !trips) {
                return <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>Loading…</p>
              }
              if (!trips || trips.flatMap(t => t.experiences).length === 0) {
                return <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>No experiences detected for this trip.</p>
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {trips.map((trip, i) => (
                    <div key={i}>
                      {trip.label && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.03em' }}>
                          {trip.label}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {trip.experiences.map(exp => (
                          <span key={exp.category} style={{
                            fontSize: '0.75rem', color: 'var(--text-accent)',
                            background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)',
                            borderRadius: 'var(--radius-md)', padding: '0.3rem 0.7rem',
                          }}>
                            {CATEGORY_LABEL[exp.category] ?? exp.category.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}

            <button
              onClick={() => setSelectedCity(null)}
              style={{
                marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              Close
            </button>
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
