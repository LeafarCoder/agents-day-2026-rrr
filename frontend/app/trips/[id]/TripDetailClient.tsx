'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { API_URL } from '@/lib/api'
import AuthGate from '@/components/AuthGate'
import dynamic from 'next/dynamic'

const WorldMap = dynamic(() => import('@/app/components/WorldMap'), { ssr: false })

type TripEmail = {
  id: string
  gmail_msg_id: string | null
  subject: string | null
  sender_domain: string | null
  email_date: string | null
}

type TripKeyword = {
  keyword: string
  count: number
  sample_subjects: { subject: string; gmail_msg_id: string | null }[]
}

type TripActivity = {
  category: string
  keywords: TripKeyword[]
}

type TripDetail = {
  id: string
  title: string | null
  start_date: string | null
  end_date: string | null
  destination_city: string | null
  destination_country: string | null
  country_code: string | null
  email_count: number
  emails: TripEmail[]
  activities: TripActivity[]
}

function flag(code: string) {
  return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function nightCount(start: string, end: string | null) {
  if (!end || end === start) return null
  const n = Math.round((new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()) / 86400000)
  return n > 0 ? n : null
}

export default function TripDetailPage() {
  const params      = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const router      = useRouter()
  const tripId      = params?.id

  const [connected, setConnected] = useState<boolean | null>(null)
  const [trip, setTrip]           = useState<TripDetail | null>(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const [activeKw, setActiveKw]   = useState<{ cat: string; kw: string } | null>(null)

  // Edit modal
  const [editOpen,  setEditOpen]  = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd,   setEditEnd]   = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError,  setEditError]  = useState('')
  const [editSaved,  setEditSaved]  = useState(false)

  const backView = searchParams?.get('from') ?? 'table'

  const load = useCallback(async () => {
    if (!tripId) return
    setLoading(true)
    setError('')
    try {
      const [tripRes, meRes] = await Promise.all([
        fetch(`${API_URL}/api/trips/${tripId}`, { credentials: 'include' }),
        fetch(`${API_URL}/api/me`, { credentials: 'include' }),
      ])
      if (!tripRes.ok) {
        setError(tripRes.status === 404 ? 'Trip not found.' : 'Failed to load trip.')
        return
      }
      setTrip(await tripRes.json())
      if (meRes.ok) {
        const me = await meRes.json()
        setConnected(me.connected ?? false)
        setUserEmail(me.user_email ?? null)
      } else {
        setConnected(false)
      }
    } catch {
      setError('Failed to load trip.')
    } finally {
      setLoading(false)
    }
  }, [tripId])

  useEffect(() => { load() }, [load])

  function gmailUrl(id: string) {
    const base = 'https://mail.google.com/mail/'
    const auth = userEmail ? `?authuser=${encodeURIComponent(userEmail)}` : 'u/0/'
    return `${base}${auth}#all/${id}`
  }

  function openEdit() {
    if (!trip) return
    setEditTitle(trip.title ?? '')
    setEditStart(trip.start_date ?? '')
    setEditEnd(trip.end_date ?? '')
    setEditError('')
    setEditSaved(false)
    setEditSaving(false)
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!trip) return
    if (editStart && editEnd && editStart > editEnd) { setEditError('Start date must be before end date.'); return }
    setEditSaving(true); setEditError('')
    try {
      const body: Record<string, unknown> = { title: editTitle.trim() || null }
      if (editStart) body.start_date = editStart
      if (editEnd)   body.end_date   = editEnd
      const res = await fetch(`${API_URL}/api/trips/${trip.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); setEditError(d.error ?? 'Save failed.'); return }
      setEditSaved(true)
      setTrip(prev => prev ? { ...prev, title: editTitle.trim() || null, start_date: editStart || null, end_date: editEnd || null } : prev)
      setTimeout(() => setEditOpen(false), 800)
    } finally { setEditSaving(false) }
  }

  if (connected === false) return <AuthGate page="Trips" />

  if (loading) return (
    <div style={{ padding: '88px 1.5rem 4rem', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ height: 20, width: 120, marginBottom: '1.5rem' }} className="skeleton" />
      <div style={{ height: 140, marginBottom: '1.5rem', borderRadius: 'var(--radius-xl)' }} className="skeleton" />
      <div style={{ height: 220, borderRadius: 'var(--radius-xl)' }} className="skeleton" />
    </div>
  )

  if (error || !trip) return (
    <div style={{ padding: '88px 1.5rem 4rem', maxWidth: 760, margin: '0 auto' }}>
      <Link href={`/trips?view=${backView}`} style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '1.5rem' }}>
        ← Back to trips
      </Link>
      <p style={{ color: '#f87171', fontSize: '0.85rem' }}>{error || 'Trip not found.'}</p>
    </div>
  )

  const nights = trip.start_date ? nightCount(trip.start_date, trip.end_date) : null
  const mapCountries = trip.country_code ? [{ name: trip.destination_country ?? '', code: trip.country_code, cities: [] }] : []

  const activeCategory = trip.activities.find(a => a.category === activeKw?.cat)
  const activeKeyword  = activeCategory?.keywords.find(k => k.keyword === activeKw?.kw)

  return (
    <div style={{ padding: '88px 1.5rem 4rem', maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Back link */}
      <Link
        href={`/trips?view=${backView}`}
        style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', alignSelf: 'flex-start' }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
      >
        ← Back to trips
      </Link>

      {/* Header card */}
      <div className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '2rem', lineHeight: 1, marginBottom: '0.4rem' }}>
              {trip.country_code ? flag(trip.country_code) : '🌍'}
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.2 }}>
              {trip.destination_city || trip.destination_country || trip.title || 'Trip'}
            </h1>
            {trip.destination_country && trip.destination_city && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>{trip.destination_country}</p>
            )}
          </div>
          <button
            onClick={openEdit}
            style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '0.35rem 0.75rem', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-accent)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0,212,170,0.4)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
          >
            ✎ Edit
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Dates</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
              {fmtDate(trip.start_date)}
              {trip.end_date && trip.end_date !== trip.start_date ? ` → ${fmtDate(trip.end_date)}` : ''}
            </div>
          </div>
          {nights !== null && (
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Duration</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{nights} night{nights !== 1 ? 's' : ''}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Emails</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text)' }}>{trip.email_count}</div>
          </div>
        </div>
      </div>

      {/* World Map */}
      {mapCountries.length > 0 && (
        <div className="glass" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          <WorldMap countries={mapCountries} />
        </div>
      )}

      {/* Activities */}
      {trip.activities.length > 0 && (
        <div className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 1rem' }}>Activities</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {trip.activities.map(act => (
              <div key={act.category}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.4rem', textTransform: 'capitalize' }}>{act.category}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {act.keywords.map(kw => {
                    const isActive = activeKw?.cat === act.category && activeKw?.kw === kw.keyword
                    return (
                      <button
                        key={kw.keyword}
                        onClick={() => setActiveKw(isActive ? null : { cat: act.category, kw: kw.keyword })}
                        style={{
                          fontSize: '0.72rem', fontWeight: 500, padding: '0.2rem 0.6rem',
                          borderRadius: 'var(--radius-sm)', border: '1px solid',
                          cursor: 'pointer',
                          background: isActive ? 'rgba(0,212,170,0.15)' : 'rgba(255,255,255,0.04)',
                          borderColor: isActive ? 'rgba(0,212,170,0.5)' : 'var(--border)',
                          color: isActive ? 'var(--text-accent)' : 'var(--text-muted)',
                          transition: 'all 150ms',
                        }}
                      >
                        {kw.keyword}
                        <span style={{ marginLeft: '0.3rem', opacity: 0.6, fontSize: '0.65rem' }}>{kw.count}</span>
                      </button>
                    )
                  })}
                </div>

                {activeKw?.cat === act.category && activeKeyword && (
                  <div style={{ marginTop: '0.6rem', paddingLeft: '0.5rem', borderLeft: '2px solid rgba(0,212,170,0.3)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <div style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.1rem' }}>
                      From your emails
                    </div>
                    {activeKeyword.sample_subjects.map((s, si) => (
                      <div key={si} style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', overflow: 'hidden' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)', fontSize: '0.78rem', flex: 1 }}>
                          {s.subject}
                        </span>
                        {s.gmail_msg_id && (
                          <a
                            href={gmailUrl(s.gmail_msg_id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in Gmail"
                            onClick={e => e.stopPropagation()}
                            style={{ color: 'var(--text-muted)', fontSize: '0.72rem', opacity: 0.6, flexShrink: 0 }}
                          >
                            ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Emails table */}
      {trip.emails.length > 0 && (
        <div className="glass" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem 0.75rem' }}>
            <h2 style={{ fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0 }}>
              Emails <span style={{ fontWeight: 400, opacity: 0.6 }}>({trip.emails.length})</span>
            </h2>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Date', 'Subject', 'Domain'].map(h => (
                    <th key={h} style={{ padding: '0.5rem 1rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trip.emails.map(em => (
                  <tr key={em.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.6rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {em.email_date ? fmtDate(em.email_date) : '—'}
                    </td>
                    <td style={{ padding: '0.6rem 1rem', maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {em.gmail_msg_id ? (
                        <a
                          href={gmailUrl(em.gmail_msg_id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--text)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-accent)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{em.subject || '—'}</span>
                          <span style={{ fontSize: '0.68rem', opacity: 0.5, flexShrink: 0 }}>↗</span>
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text)' }}>{em.subject || '—'}</span>
                      )}
                    </td>
                    <td style={{ padding: '0.6rem 1rem', color: 'var(--text-muted)' }}>{em.sender_domain || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editOpen && (
        <div
          onClick={() => setEditOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="glass fade-in modal-card"
            style={{ borderRadius: 'var(--radius-xl)', padding: '1.75rem', width: '100%', maxWidth: 440, border: '1px solid var(--border)', boxShadow: '0 24px 64px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 0.25rem' }}>Edit trip</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                {trip.country_code ? flag(trip.country_code) + ' ' : ''}
                {[trip.destination_city, trip.destination_country].filter(Boolean).join(', ') || 'Unknown destination'}
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>Title</label>
                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Trip title"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.45rem 0.75rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', outline: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>Start date</label>
                  <input type="date" value={editStart} onChange={e => setEditStart(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.45rem 0.75rem', fontSize: '0.82rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>End date</label>
                  <input type="date" value={editEnd} onChange={e => setEditEnd(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.45rem 0.75rem', fontSize: '0.82rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', outline: 'none' }} />
                </div>
              </div>
            </div>
            {editError && <p style={{ fontSize: '0.78rem', color: '#f87171', margin: 0 }}>{editError}</p>}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button onClick={saveEdit} disabled={editSaving}
                style={{ padding: '0.45rem 1.1rem', borderRadius: 'var(--radius-md)', background: 'var(--text-accent)', color: '#040b18', fontSize: '0.82rem', fontWeight: 600, border: 'none', cursor: editSaving ? 'default' : 'pointer', opacity: editSaving ? 0.7 : 1 }}>
                {editSaved ? 'Saved ✓' : editSaving ? 'Saving…' : 'Save changes'}
              </button>
              <button onClick={() => setEditOpen(false)} className="btn btn-ghost" style={{ fontSize: '0.82rem' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
