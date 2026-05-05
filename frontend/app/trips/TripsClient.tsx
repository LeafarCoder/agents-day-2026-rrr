'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { API_URL } from '@/lib/api'
import AuthGate from '@/components/AuthGate'
import SelectBox from '@/components/SelectBox'
import Timeline from './views/Timeline'
import Calendar from './views/Calendar'
import Heatmap  from './views/Heatmap'

type Trip = {
  id: string
  title: string | null
  start_date: string | null
  end_date: string | null
  city_id: string | null
  city_name: string | null
  country_name: string | null
  country_code: string | null
  email_count: number
}

type TripEmail = {
  id: string
  gmail_msg_id: string
  subject: string
  sender_domain: string
  email_date: string
  llm_extraction: Record<string, unknown> | null
}

type MergeCandidate = {
  trip_a: Trip
  trip_b: Trip
  score: number
  reason: string
}

function flag(code: string) {
  return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function dateRange(start: string | null, end: string | null) {
  if (!start && !end) return '—'
  if (start && end && start !== end) return `${fmtDate(start)} – ${fmtDate(end)}`
  return fmtDate(start || end)
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | '...')[] = [1]
  if (current > 3) pages.push('...')
  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p)
  if (current < total - 2) pages.push('...')
  pages.push(total)
  return pages
}

const PAGE_SIZE = 25

type ViewMode = 'table' | 'timeline' | 'calendar' | 'heatmap'

const VIEW_TABS: { id: ViewMode; label: string }[] = [
  { id: 'table',    label: 'Table'    },
  { id: 'timeline', label: 'Timeline' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'heatmap',  label: 'Heatmap'  },
]

export default function TripsPage() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const viewParam    = (searchParams?.get('view') ?? 'table') as ViewMode
  const view: ViewMode = VIEW_TABS.some(t => t.id === viewParam) ? viewParam : 'table'

  function setView(v: ViewMode) {
    const params = new URLSearchParams(searchParams?.toString() ?? '')
    params.set('view', v)
    router.push(`/trips?${params.toString()}`)
  }

  const [connected, setConnected] = useState<boolean | null>(null)
  const [trips, setTrips] = useState<Trip[]>([])
  const [candidates, setCandidates] = useState<MergeCandidate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)

  // Pagination
  const [page, setPage] = useState(1)

  // Sort
  const [sortKey, setSortKey] = useState<'start_date' | 'title' | 'email_count'>('start_date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  // Row expand (drill-down emails)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedEmails, setExpandedEmails] = useState<TripEmail[]>([])
  const [expandedLoading, setExpandedLoading] = useState(false)

  // Selection (for merge)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Edit modal
  const [editTrip, setEditTrip] = useState<Trip | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSaved, setEditSaved] = useState(false)

  // Merge modal
  const [mergeTrips, setMergeTrips] = useState<Trip[]>([])
  const [keepId, setKeepId] = useState<string | null>(null)
  const [merging, setMerging] = useState(false)
  const [mergeError, setMergeError] = useState('')

  // Suggested merges collapse
  const [candidatesOpen, setCandidatesOpen] = useState(false)

  const loadAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [tripsRes, candRes, meRes] = await Promise.all([
        fetch(`${API_URL}/api/trips`, { credentials: 'include' }),
        fetch(`${API_URL}/api/trips/merge-candidates`, { credentials: 'include' }),
        fetch(`${API_URL}/api/me`, { credentials: 'include' }),
      ])
      if (!tripsRes.ok) throw new Error('Failed to load trips')
      const tripsData: Trip[] = await tripsRes.json()
      setTrips(tripsData)
      if (candRes.ok) {
        const candData: MergeCandidate[] = await candRes.json()
        setCandidates(candData)
      }
      if (meRes.ok) {
        const me = await meRes.json()
        setConnected(me.connected ?? false)
        setUserEmail(me.user_email ?? null)
      } else {
        setConnected(false)
      }
    } catch {
      setError('Failed to load trips. Are you signed in?')
    } finally {
      setLoading(false)
    }
  }, [])

  function gmailUrl(gmailMsgId: string): string {
    const base = 'https://mail.google.com/mail/'
    const auth = userEmail ? `?authuser=${encodeURIComponent(userEmail)}` : 'u/0/'
    return `${base}${auth}#all/${gmailMsgId}`
  }

  useEffect(() => { loadAll() }, [loadAll])

  // Sort + paginate
  const sorted = [...trips].sort((a, b) => {
    let va: string | number = sortKey === 'email_count' ? a.email_count : (a[sortKey] ?? '')
    let vb: string | number = sortKey === 'email_count' ? b.email_count : (b[sortKey] ?? '')
    if (typeof va === 'string') va = va.toLowerCase()
    if (typeof vb === 'string') vb = vb.toLowerCase()
    if (va < vb) return sortDir === 'asc' ? -1 : 1
    if (va > vb) return sortDir === 'asc' ? 1 : -1
    return 0
  })
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const pageTrips = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function toggleSort(key: typeof sortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'email_count' ? 'desc' : 'asc')
    }
    setPage(1)
  }

  function sortArrow(key: typeof sortKey) {
    if (sortKey !== key) return <span style={{ opacity: 0.3 }}> ↕</span>
    return <span style={{ color: 'var(--text-accent)' }}>{sortDir === 'asc' ? ' ↑' : ' ↓'}</span>
  }

  // Drill-down
  async function toggleExpand(tripId: string) {
    if (expandedId === tripId) {
      setExpandedId(null)
      return
    }
    setExpandedId(tripId)
    setExpandedEmails([])
    setExpandedLoading(true)
    try {
      const res = await fetch(`${API_URL}/api/trips/${tripId}/emails`, { credentials: 'include' })
      if (res.ok) setExpandedEmails(await res.json())
    } finally {
      setExpandedLoading(false)
    }
  }

  // Selection
  const allPageSelected = pageTrips.length > 0 && pageTrips.every(t => selectedIds.has(t.id))
  const somePageSelected = pageTrips.some(t => selectedIds.has(t.id))

  function openEditModal(trip: Trip) {
    setEditTrip(trip)
    setEditTitle(trip.title ?? '')
    setEditStart(trip.start_date ?? '')
    setEditEnd(trip.end_date ?? '')
    setEditError('')
    setEditSaved(false)
    setEditSaving(false)
  }

  async function saveEdit() {
    if (!editTrip) return
    if (editStart && editEnd && editStart > editEnd) {
      setEditError('Start date must be before end date.')
      return
    }
    setEditSaving(true)
    setEditError('')
    try {
      const body: Record<string, unknown> = { title: editTitle.trim() || null }
      if (editStart) body.start_date = editStart
      if (editEnd) body.end_date = editEnd
      const res = await fetch(`${API_URL}/api/trips/${editTrip.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setEditError(d.error ?? 'Save failed.')
        return
      }
      setEditSaved(true)
      setTrips(prev => prev.map(t =>
        t.id === editTrip.id
          ? { ...t, title: editTitle.trim() || null, start_date: editStart || null, end_date: editEnd || null }
          : t
      ))
      setTimeout(() => setEditTrip(null), 900)
    } finally {
      setEditSaving(false)
    }
  }

  function openMergeModal(selection: Trip[]) {
    const sorted = [...selection].sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? ''))
    setMergeTrips(selection)
    setKeepId(sorted[0]?.id ?? selection[0]?.id ?? null)
    setMergeError('')
    setMerging(false)
  }

  async function confirmMerge() {
    if (!keepId || mergeTrips.length < 2) return
    setMerging(true)
    setMergeError('')
    try {
      const res = await fetch(`${API_URL}/api/trips/merge`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_ids: mergeTrips.map(t => t.id), keep_id: keepId }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setMergeError(d.error ?? 'Merge failed.')
        return
      }
      setMergeTrips([])
      setSelectedIds(new Set())
      await loadAll()
    } finally {
      setMerging(false)
    }
  }

  const showMergeModal = mergeTrips.length >= 2

  if (connected === false) return <AuthGate page="Trips" />

  if (loading) return (
    <div style={{ padding: '88px 1.5rem 4rem', maxWidth: 840, margin: '0 auto' }}>
      <div style={{ height: 28, width: 80, marginBottom: '2rem' }} className="skeleton" />
      <div style={{ height: 300 }} className="skeleton" />
    </div>
  )

  return (
    <div style={{ padding: '88px 1.5rem 4rem', maxWidth: 840, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
          Trips
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
          {trips.length} trip{trips.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {error && (
        <div style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.25)', fontSize: '0.82rem', color: '#f87171' }}>
          {error}
        </div>
      )}

      {/* Suggested merges */}
      {candidates.length > 0 && (
        <div className="glass" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
          <div
            onClick={() => setCandidatesOpen(o => !o)}
            style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Suggested merges
              </span>
              <span style={{
                fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-accent)',
                background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.25)',
                borderRadius: 'var(--radius-sm)', padding: '0.1rem 0.4rem',
              }}>
                {candidates.length}
              </span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', transition: 'transform 150ms', display: 'inline-block', transform: candidatesOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
          </div>

          {candidatesOpen && (
            <div style={{ borderTop: '1px solid var(--border)', padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {candidates.map((c, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
                  padding: '0.65rem 0.875rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.trip_a.title || 'Untitled'} + {c.trip_b.title || 'Untitled'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{c.reason}</div>
                  </div>
                  <button
                    onClick={() => openMergeModal([c.trip_a, c.trip_b])}
                    style={{
                      fontSize: '0.72rem', fontWeight: 500, color: 'var(--text-accent)',
                      background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)',
                      borderRadius: 'var(--radius-md)', padding: '0.3rem 0.7rem',
                      cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    }}
                  >
                    Review →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* View tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-lg)', padding: '0.25rem', border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
        {VIEW_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              fontSize: '0.78rem', fontWeight: 500, padding: '0.3rem 0.85rem',
              borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
              background: view === tab.id ? 'rgba(0,212,170,0.15)' : 'transparent',
              color: view === tab.id ? 'var(--text-accent)' : 'var(--text-muted)',
              transition: 'all 150ms',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Non-table views */}
      {view !== 'table' && (
        <div className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
          {view === 'timeline' && <Timeline trips={trips} />}
          {view === 'calendar' && <Calendar trips={trips} />}
          {view === 'heatmap'  && <Heatmap  trips={trips} />}
        </div>
      )}

      {/* Trips table */}
      {view === 'table' && <div className="glass" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            All trips <span style={{ fontWeight: 400, opacity: 0.6 }}>({trips.length})</span>
          </h2>
          {selectedIds.size >= 2 && (
            <button
              onClick={() => openMergeModal(trips.filter(t => selectedIds.has(t.id)))}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                fontSize: '0.72rem', fontWeight: 500,
                color: 'var(--text-accent)',
                background: 'rgba(0,212,170,0.08)',
                border: '1px solid rgba(0,212,170,0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '0.3rem 0.75rem',
                cursor: 'pointer',
              }}
            >
              Merge selected ({selectedIds.size})
            </button>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.6rem 0.75rem 0.6rem 1rem', width: 36, textAlign: 'center' }}>
                  <SelectBox
                    checked={allPageSelected}
                    indeterminate={!allPageSelected && somePageSelected}
                    onChange={() => {
                      if (allPageSelected) {
                        setSelectedIds(prev => { const n = new Set(prev); pageTrips.forEach(t => n.delete(t.id)); return n })
                      } else {
                        setSelectedIds(prev => { const n = new Set(prev); pageTrips.forEach(t => n.add(t.id)); return n })
                      }
                    }}
                  />
                </th>
                {([['title', 'Title'], ['start_date', 'Dates'], ['email_count', 'Emails']] as const).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}
                  >
                    {label}{sortArrow(key)}
                  </th>
                ))}
                <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  Destination
                </th>
                <th style={{ padding: '0.6rem 1rem', width: 80 }} />
              </tr>
            </thead>
            <tbody>
              {pageTrips.map(trip => (
                <Fragment key={trip.id}>
                  <tr
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 150ms' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '0.5rem 0.75rem 0.5rem 1rem', textAlign: 'center' }}>
                      <SelectBox
                        checked={selectedIds.has(trip.id)}
                        onChange={() => setSelectedIds(prev => { const n = new Set(prev); n.has(trip.id) ? n.delete(trip.id) : n.add(trip.id); return n })}
                        onClick={e => e.stopPropagation()}
                      />
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text)', fontWeight: 500, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {trip.title || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Untitled</span>}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {dateRange(trip.start_date, trip.end_date)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                      {trip.email_count}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {trip.country_code ? flag(trip.country_code) + ' ' : ''}
                      {[trip.city_name, trip.country_name].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td style={{ padding: '0.5rem 0.75rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => openEditModal(trip)}
                          title="Edit trip"
                          style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0.4rem', borderRadius: 'var(--radius-sm)' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-accent)'; (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,170,0.08)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; (e.currentTarget as HTMLElement).style.background = 'none' }}
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => toggleExpand(trip.id)}
                          title="Show emails"
                          style={{
                            fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.2rem 0.4rem', borderRadius: 'var(--radius-sm)',
                            transition: 'transform 150ms', display: 'inline-block', transform: expandedId === trip.id ? 'rotate(180deg)' : 'none',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
                        >
                          ▾
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expandedId === trip.id && (
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      <td colSpan={6} style={{ padding: '0 1rem 1rem 3rem' }}>
                        {expandedLoading ? (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>Loading emails…</div>
                        ) : expandedEmails.length === 0 ? (
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>No emails for this trip.</div>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', marginTop: '0.25rem' }}>
                            <thead>
                              <tr>
                                {['Date', 'Subject', 'Domain'].map(h => (
                                  <th key={h} style={{ padding: '0.3rem 0.5rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {expandedEmails.map(em => (
                                <tr key={em.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                  <td style={{ padding: '0.35rem 0.5rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{em.email_date ? fmtDate(em.email_date) : '—'}</td>
                                  <td style={{ padding: '0.35rem 0.5rem', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {em.gmail_msg_id ? (
                                      <a
                                        href={gmailUrl(em.gmail_msg_id)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        title="Open in Gmail"
                                        style={{ color: 'var(--text)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-accent)' }}
                                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
                                      >
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{em.subject || '—'}</span>
                                        <span style={{ fontSize: '0.7rem', opacity: 0.5, flexShrink: 0 }}>↗</span>
                                      </a>
                                    ) : (
                                      <span style={{ color: 'var(--text)' }}>{em.subject || '—'}</span>
                                    )}
                                  </td>
                                  <td style={{ padding: '0.35rem 0.5rem', color: 'var(--text-muted)' }}>{em.sender_domain || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.875rem 1.5rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <button onClick={() => setPage(1)} disabled={page === 1} style={{ fontSize: '0.75rem', color: page === 1 ? 'var(--text-muted)' : 'var(--text-accent)', background: 'none', border: 'none', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1, padding: '0.25rem 0.4rem' }}>«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ fontSize: '0.75rem', color: page === 1 ? 'var(--text-muted)' : 'var(--text-accent)', background: 'none', border: 'none', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1, padding: '0.25rem 0.4rem' }}>‹</button>
            {getPageNumbers(page, totalPages).map((p, i) =>
              p === '...'
                ? <span key={`e${i}`} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.25rem 0.2rem' }}>…</span>
                : <button key={p} onClick={() => setPage(p)} style={{ fontSize: '0.75rem', fontWeight: p === page ? 600 : 400, color: p === page ? 'var(--text)' : 'var(--text-muted)', background: p === page ? 'rgba(255,255,255,0.08)' : 'none', border: p === page ? '1px solid var(--border)' : 'none', borderRadius: 'var(--radius-sm)', cursor: p === page ? 'default' : 'pointer', padding: '0.2rem 0.5rem', minWidth: 28 }}>{p}</button>
            )}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ fontSize: '0.75rem', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-accent)', background: 'none', border: 'none', cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1, padding: '0.25rem 0.4rem' }}>›</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{ fontSize: '0.75rem', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-accent)', background: 'none', border: 'none', cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1, padding: '0.25rem 0.4rem' }}>»</button>
          </div>
        )}
      </div>}

      {/* Edit modal */}
      {editTrip && (
        <div
          onClick={() => setEditTrip(null)}
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
                {editTrip.country_code ? flag(editTrip.country_code) + ' ' : ''}
                {[editTrip.city_name, editTrip.country_name].filter(Boolean).join(', ') || 'Unknown destination'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  placeholder="Trip title"
                  style={{ width: '100%', boxSizing: 'border-box', padding: '0.45rem 0.75rem', fontSize: '0.85rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>Start date</label>
                  <input
                    type="date"
                    value={editStart}
                    onChange={e => setEditStart(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.45rem 0.75rem', fontSize: '0.82rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' }}>End date</label>
                  <input
                    type="date"
                    value={editEnd}
                    onChange={e => setEditEnd(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.45rem 0.75rem', fontSize: '0.82rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text)', outline: 'none' }}
                  />
                </div>
              </div>
            </div>

            {editError && (
              <p style={{ fontSize: '0.78rem', color: '#f87171', margin: 0 }}>{editError}</p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <button
                onClick={saveEdit}
                disabled={editSaving}
                style={{ padding: '0.45rem 1.1rem', borderRadius: 'var(--radius-md)', background: 'var(--text-accent)', color: '#040b18', fontSize: '0.82rem', fontWeight: 600, border: 'none', cursor: editSaving ? 'default' : 'pointer', opacity: editSaving ? 0.7 : 1 }}
              >
                {editSaved ? 'Saved ✓' : editSaving ? 'Saving…' : 'Save changes'}
              </button>
              <button onClick={() => setEditTrip(null)} className="btn btn-ghost" style={{ fontSize: '0.82rem' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Merge confirmation modal */}
      {showMergeModal && (
        <div
          onClick={() => { setMergeTrips([]); setSelectedIds(new Set()) }}
          style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="glass fade-in modal-card"
            style={{ borderRadius: 'var(--radius-xl)', padding: '1.75rem', width: '100%', maxWidth: 460, border: '1px solid rgba(0,212,170,0.25)', boxShadow: '0 24px 64px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
          >
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 0.4rem' }}>
                Merge {mergeTrips.length} trips?
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                All emails will be moved to the trip you keep. The others will be deleted.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Keep this trip
              </div>
              {mergeTrips.map(t => (
                <label key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', padding: '0.6rem 0.75rem', borderRadius: 'var(--radius-md)', background: keepId === t.id ? 'rgba(0,212,170,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${keepId === t.id ? 'rgba(0,212,170,0.25)' : 'var(--border)'}`, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="keep"
                    value={t.id}
                    checked={keepId === t.id}
                    onChange={() => setKeepId(t.id)}
                    style={{ marginTop: '0.1rem', accentColor: 'var(--text-accent)' }}
                  />
                  <div>
                    <div style={{ fontSize: '0.83rem', fontWeight: 500, color: 'var(--text)' }}>{t.title || 'Untitled'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      {dateRange(t.start_date, t.end_date)}
                      {t.city_name ? ` · ${t.country_code ? flag(t.country_code) + ' ' : ''}${t.city_name}` : ''}
                      {` · ${t.email_count} email${t.email_count !== 1 ? 's' : ''}`}
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {mergeError && (
              <p style={{ fontSize: '0.78rem', color: '#f87171', margin: 0 }}>{mergeError}</p>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setMergeTrips([]); setSelectedIds(new Set()) }}
                className="btn btn-ghost"
                style={{ fontSize: '0.82rem' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmMerge}
                disabled={merging || !keepId}
                style={{
                  padding: '0.45rem 1rem', borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(0,212,170,0.4)',
                  background: 'rgba(0,212,170,0.12)',
                  color: 'var(--text-accent)',
                  fontSize: '0.82rem', fontWeight: 600,
                  cursor: merging ? 'default' : 'pointer',
                  opacity: merging ? 0.7 : 1,
                }}
              >
                {merging ? 'Merging…' : 'Confirm merge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
