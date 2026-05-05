'use client'

import { Suspense, useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { API_URL, apiFetch } from '@/lib/api'
import { useIsMobile } from '@/lib/useIsMobile'
import AuthGate from '@/components/AuthGate'
import SelectBox from '@/components/SelectBox'

type Booking = {
  id: string | null
  date: string
  domain: string
  destination: string | null
  subject: string
  city: string | null
  country: string | null
  country_code: string | null
  start_date: string | null
  end_date: string | null
  trip_label: string | null
  booking_type: string | null
  is_travel_booking: boolean | null
  keyword_hits: Record<string, string[]>
}
type Profile = {
  last_scanned?: string
  email_count?: number
  destinations?: string[]
  preferences?: Record<string, number>
  platforms?: Record<string, number>
  from_date?: string | null
  to_date?: string | null
}
type ScanData = { profile: Profile | null; bookings: Booking[] }

function flagEmoji(code: string) {
  return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
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

function BookingModal({ booking, onClose }: { booking: Booking; onClose: () => void }) {
  const hasTrip = booking.city || booking.country || booking.start_date
  const hasKeywords = Object.keys(booking.keyword_hits ?? {}).length > 0

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="glass fade-in modal-card"
        style={{
          borderRadius: 'var(--radius-xl)',
          padding: '1.75rem',
          width: '100%', maxWidth: 480,
          border: '1px solid var(--border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
          maxHeight: '85vh',
          overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: '1.25rem',
        }}
      >
        {/* Header */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            {booking.booking_type && (
              <span style={{
                fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase',
                color: 'var(--text-accent)', background: 'rgba(0,212,170,0.1)',
                border: '1px solid rgba(0,212,170,0.25)', borderRadius: 'var(--radius-sm)',
                padding: '0.15rem 0.45rem',
              }}>
                {booking.booking_type}
              </span>
            )}
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{booking.domain}</span>
            {booking.date && (
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{booking.date}</span>
            )}
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.35 }}>
            {booking.subject}
          </h2>
        </div>

        {/* Trip */}
        {hasTrip && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.1rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Trip
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {(booking.city || booking.country) && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Destination</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text)', fontWeight: 500 }}>
                    {booking.country_code ? flagEmoji(booking.country_code) + ' ' : ''}
                    {[booking.city, booking.country].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              {booking.start_date && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Check-in</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{booking.start_date}</span>
                </div>
              )}
              {booking.end_date && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Check-out</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{booking.end_date}</span>
                </div>
              )}
              {booking.trip_label && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Duration</span>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-accent)' }}>{booking.trip_label}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Activity keywords */}
        {hasKeywords && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.1rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Activity Signals
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {Object.entries(booking.keyword_hits).map(([cat, kws]) => (
                <div key={cat} style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: 100, textTransform: 'capitalize' }}>
                    {cat.replace(/_/g, ' ')}
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                    {kws.map(kw => (
                      <span key={kw} style={{
                        fontSize: '0.7rem', color: 'var(--text)',
                        background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.18)',
                        borderRadius: 'var(--radius-sm)', padding: '0.15rem 0.45rem',
                      }}>{kw}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          style={{ alignSelf: 'flex-start', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          Close
        </button>
      </div>
    </div>
  )
}

function ScanResultsContent() {
  const searchParams = useSearchParams()
  const fromParam = searchParams.get('from')
  const toParam   = searchParams.get('to')
  const isScanView = !!(fromParam && toParam)

  const [connected, setConnected] = useState<boolean | null>(null)
  const [data, setData] = useState<ScanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [platformsOpen, setPlatformsOpen] = useState(false)
  const [platformSearch, setPlatformSearch] = useState('')
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const isMobile = useIsMobile()

  // Filters
  type TypeFilter = 'all' | 'trip' | 'non-trip'
  type DateFilter = 'all' | 'month' | 'year' | '10years'
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [platformFilter, setPlatformFilter] = useState<Set<string>>(new Set())
  const [platformFilterSearch, setPlatformFilterSearch] = useState('')
  const [platformFilterOpen, setPlatformFilterOpen] = useState(false)
  const platformFilterRef = useRef<HTMLDivElement>(null)

  async function excludeBooking(id: string) {
    setExcludedIds(prev => new Set(prev).add(id))
    try {
      await apiFetch(`${API_URL}/api/bookings/${encodeURIComponent(id)}/exclude`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      // optimistic remove stays
    }
  }

  async function bulkExclude() {
    const ids = [...selectedIds]
    setSelectedIds(new Set())
    setExcludedIds(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      return next
    })
    await Promise.all(
      ids.map(id =>
        apiFetch(`${API_URL}/api/bookings/${encodeURIComponent(id)}/exclude`, {
          method: 'POST', credentials: 'include',
        }).catch(() => {})
      )
    )
  }

  useEffect(() => {
    const url = isScanView
      ? `${API_URL}/api/scan?from_date=${fromParam}&to_date=${toParam}`
      : `${API_URL}/api/scan`

    apiFetch(`${API_URL}/api/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setConnected(d?.connected ?? false))
      .catch(() => setConnected(false))

    apiFetch(url, { credentials: 'include' })
      .then(r => {
        if (r.status === 401) { setConnected(false); return null }
        return r.json()
      })
      .then(d => { if (d) setData(d) })
      .catch(() => setError('Failed to load results.'))
      .finally(() => setLoading(false))
  }, [isScanView, fromParam, toParam])

  // Derived data — must be before any early returns (Rules of Hooks)
  const { profile, bookings: allBookings = [] } = data ?? { profile: null, bookings: [] }
  const platforms = profile?.platforms ? Object.entries(profile.platforms) : []

  const allPlatforms = useMemo(() =>
    [...new Set(allBookings.map(b => b.domain).filter(Boolean))].sort()
  , [allBookings])

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (platformFilterRef.current && !platformFilterRef.current.contains(e.target as Node))
        setPlatformFilterOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  useEffect(() => { setPage(1) }, [typeFilter, dateFilter, platformFilter, excludedIds])

  const bookings = useMemo(() => {
    const now = Date.now()
    const MS = { month: 30, year: 365, '10years': 3650 }
    const cutoff = dateFilter !== 'all' ? now - MS[dateFilter] * 86400_000 : null
    return allBookings.filter(b => {
      if (b.id && excludedIds.has(b.id)) return false
      if (typeFilter === 'trip' && b.is_travel_booking !== true) return false
      if (typeFilter === 'non-trip' && b.is_travel_booking === true) return false
      if (cutoff !== null) {
        const t = new Date(b.date).getTime()
        if (isNaN(t) || t < cutoff) return false
      }
      if (platformFilter.size > 0 && !platformFilter.has(b.domain)) return false
      return true
    })
  }, [allBookings, excludedIds, typeFilter, dateFilter, platformFilter])

  if (connected === false) return <AuthGate page="Emails" />

  /* ── Loading ──────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ padding: '88px 1.5rem 4rem', maxWidth: 760, margin: '0 auto' }}>
        <div style={{ height: 28, width: 120, marginBottom: '2rem' }} className="skeleton" />
        <div style={{ height: 48, width: '60%', marginBottom: '0.75rem' }} className="skeleton" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', margin: '2rem 0' }}>
          {[...Array(4)].map((_, i) => <div key={i} style={{ height: 80 }} className="skeleton" />)}
        </div>
        <div style={{ height: 300 }} className="skeleton" />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '88px 1.5rem', maxWidth: 760, margin: '0 auto' }}>
        <p style={{ color: '#f87171', fontSize: '0.9rem' }}>{error}</p>
      </div>
    )
  }

  const PAGE_SIZE = 25
  const totalPages = Math.max(1, Math.ceil(bookings.length / PAGE_SIZE))
  const pageBookings = bookings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pageBookingsWithId = pageBookings.filter(b => b.id != null)
  const allPageSelected = pageBookingsWithId.length > 0 && pageBookingsWithId.every(b => selectedIds.has(b.id!))
  const somePageSelected = pageBookingsWithId.some(b => selectedIds.has(b.id!))

  /* ── Empty state ──────────────────────────────────────────────── */
  if (!data || bookings.length === 0) {
    return (
      <div style={{ padding: '88px 1.5rem 4rem', maxWidth: 760, margin: '0 auto' }}>
        <Link href="/" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2rem' }}>
          ← Back
        </Link>
        <div className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🗺️</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
            {isScanView ? 'No bookings found in this date range' : 'No results yet'}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            {isScanView
              ? `No booking confirmation emails were found between ${fmtDate(fromParam!)} and ${fmtDate(toParam!)}.`
              : 'Scan your emails to see booking history here.'}
          </p>
          {isScanView
            ? <Link href="/emails" className="btn btn-ghost" style={{ fontSize: '0.82rem', marginRight: '0.75rem' }}>View all emails</Link>
            : null}
          <Link href="/email-scan" className="btn btn-primary">Scan Emails</Link>
        </div>
      </div>
    )
  }

  /* ── Results ──────────────────────────────────────────────────── */
  return (
    <div style={{ padding: '88px 1.5rem 4rem', maxWidth: 760, margin: '0 auto' }}>

      {/* Header */}
      <div className="fade-up" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
          {isScanView
            ? <Link href="/emails" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                ← All emails
              </Link>
            : <Link href="/" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                ← Profile
              </Link>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.15 }}>
              {isScanView ? 'Scan Results' : 'Emails'}
            </h1>
            {!isScanView && (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.3rem 0 0' }}>
                Every travel booking email detected in your Gmail inbox.
              </p>
            )}
          </div>
          {profile?.last_scanned && !isScanView && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>
              Last scan {fmtDate(profile.last_scanned)}
            </span>
          )}
        </div>
      </div>

      {/* Scan parameters banner — only in scan view */}
      {isScanView && fromParam && toParam && (
        <div className="fade-up glass-subtle" style={{
          borderRadius: 'var(--radius-lg)', padding: '0.875rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap',
          border: '1px solid rgba(0,212,170,0.18)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              fontSize: '0.65rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--text-accent)', background: 'rgba(0,212,170,0.1)',
              border: '1px solid rgba(0,212,170,0.25)', borderRadius: 'var(--radius-sm)',
              padding: '0.2rem 0.5rem', flexShrink: 0,
            }}>
              Scan
            </span>
            <span style={{ fontSize: '0.82rem', color: 'var(--text)' }}>
              {fmtDate(fromParam)} → {fmtDate(toParam)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link
              href={`/email-scan`}
              style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              Scan again
            </Link>
            <span style={{ width: 1, height: 14, background: 'var(--border)' }} />
            <Link
              href="/emails"
              style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              View all emails →
            </Link>
          </div>
        </div>
      )}

      {/* Stats grid */}
      <div className="fade-up d-100" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Emails',       value: profile?.email_count ?? bookings.length },
          { label: 'Destinations', value: profile?.destinations?.length ?? 0 },
          { label: 'Preferences',  value: Object.keys(profile?.preferences ?? {}).length },
          { label: 'Platforms',    value: platforms.length },
        ].map(({ label, value }) => (
          <div key={label} className="glass-subtle" style={{ borderRadius: 'var(--radius-lg)', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Bookings table */}
      <div className="fade-up d-300 glass" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        {/* Header row */}
        <div style={{ padding: '1.25rem 1.5rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            Emails <span style={{ fontWeight: 400, opacity: 0.6 }}>({bookings.length}{bookings.length !== allBookings.length ? ` of ${allBookings.length}` : ''})</span>
          </h2>
          {selectedIds.size > 0 && (
            <button
              onClick={bulkExclude}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                fontSize: '0.72rem', fontWeight: 500,
                color: '#f87171',
                background: 'rgba(248,113,113,0.08)',
                border: '1px solid rgba(248,113,113,0.25)',
                borderRadius: 'var(--radius-md)',
                padding: '0.3rem 0.75rem',
                cursor: 'pointer',
                transition: 'background 150ms',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
            >
              <svg width="12" height="12" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M4 6.5h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              Remove from analysis ({selectedIds.size})
            </button>
          )}
        </div>

        {/* Filter bar */}
        <div style={{ padding: '0 1.5rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          {/* Type filter */}
          <div style={{ display: 'flex', gap: '0.2rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', padding: '0.2rem' }}>
            {([['all', 'All'], ['trip', 'Trip'], ['non-trip', 'Non-trip']] as [TypeFilter, string][]).map(([v, label]) => (
              <button key={v} onClick={() => setTypeFilter(v)} style={{
                fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: 'calc(var(--radius-md) - 2px)',
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                background: typeFilter === v ? 'rgba(0,212,170,0.15)' : 'transparent',
                color: typeFilter === v ? 'var(--text-accent)' : 'var(--text-muted)',
                fontWeight: typeFilter === v ? 600 : 400,
                transition: 'all 140ms',
              }}>{label}</button>
            ))}
          </div>

          {/* Date filter */}
          <div style={{ display: 'flex', gap: '0.2rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', padding: '0.2rem' }}>
            {([['all', 'All time'], ['month', 'Month'], ['year', 'Year'], ['10years', '10 y']] as [DateFilter, string][]).map(([v, label]) => (
              <button key={v} onClick={() => setDateFilter(v)} style={{
                fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: 'calc(var(--radius-md) - 2px)',
                border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
                background: dateFilter === v ? 'rgba(0,212,170,0.15)' : 'transparent',
                color: dateFilter === v ? 'var(--text-accent)' : 'var(--text-muted)',
                fontWeight: dateFilter === v ? 600 : 400,
                transition: 'all 140ms',
              }}>{label}</button>
            ))}
          </div>

          {/* Platform multi-select */}
          <div ref={platformFilterRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setPlatformFilterOpen(o => !o)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                fontSize: '0.72rem', padding: '0.3rem 0.7rem',
                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                background: platformFilter.size > 0 ? 'rgba(0,212,170,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${platformFilter.size > 0 ? 'rgba(0,212,170,0.35)' : 'rgba(255,255,255,0.08)'}`,
                color: platformFilter.size > 0 ? 'var(--text-accent)' : 'var(--text-muted)',
                transition: 'all 140ms', whiteSpace: 'nowrap',
              }}
            >
              {platformFilter.size > 0 ? `${platformFilter.size} platform${platformFilter.size > 1 ? 's' : ''}` : 'Platforms'}
              {platformFilter.size > 0 && (
                <span
                  onClick={e => { e.stopPropagation(); setPlatformFilter(new Set()) }}
                  style={{ marginLeft: 2, opacity: 0.7, fontSize: '0.65rem', lineHeight: 1 }}
                >✕</span>
              )}
              {platformFilter.size === 0 && <span style={{ opacity: 0.5, fontSize: '0.6rem' }}>▾</span>}
            </button>

            {platformFilterOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 30,
                minWidth: 220, maxWidth: 280,
                background: 'var(--nav-surface)', backdropFilter: 'blur(20px)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                overflow: 'hidden',
              }}>
                <div style={{ padding: '0.5rem' }}>
                  <input
                    autoFocus
                    placeholder="Search platforms…"
                    value={platformFilterSearch}
                    onChange={e => setPlatformFilterSearch(e.target.value)}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '0.35rem 0.6rem', fontSize: '0.75rem',
                      background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)', color: 'var(--text)', outline: 'none',
                    }}
                  />
                </div>
                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {allPlatforms
                    .filter(p => p.toLowerCase().includes(platformFilterSearch.toLowerCase()))
                    .map(p => (
                      <label key={p} style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.4rem 0.75rem', cursor: 'pointer',
                        background: platformFilter.has(p) ? 'rgba(0,212,170,0.07)' : 'transparent',
                        transition: 'background 120ms',
                      }}>
                        <SelectBox
                          checked={platformFilter.has(p)}
                          onChange={() => setPlatformFilter(prev => {
                            const n = new Set(prev)
                            n.has(p) ? n.delete(p) : n.add(p)
                            return n
                          })}
                        />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p}</span>
                      </label>
                    ))
                  }
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="scroll-x" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '0.6rem 0.75rem 0.6rem 1rem', width: 36, textAlign: 'center' }}>
                  <SelectBox
                    checked={allPageSelected}
                    indeterminate={!allPageSelected && somePageSelected}
                    onChange={() => {
                      if (allPageSelected) {
                        setSelectedIds(prev => {
                          const next = new Set(prev)
                          pageBookingsWithId.forEach(b => next.delete(b.id!))
                          return next
                        })
                      } else {
                        setSelectedIds(prev => {
                          const next = new Set(prev)
                          pageBookingsWithId.forEach(b => next.add(b.id!))
                          return next
                        })
                      }
                    }}
                  />
                </th>
                {['Date', 'Destination', 'Subject'].map(h => (
                  <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
                {!isMobile && (
                  <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    Platform
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {pageBookings.map((b, i) => (
                <tr
                  key={i}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 150ms' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.4rem 0.75rem 0.4rem 1rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {b.id && (
                      <SelectBox
                        checked={selectedIds.has(b.id)}
                        onChange={() => setSelectedIds(prev => {
                          const next = new Set(prev)
                          next.has(b.id!) ? next.delete(b.id!) : next.add(b.id!)
                          return next
                        })}
                        onClick={e => e.stopPropagation()}
                      />
                    )}
                  </td>
                  <td onClick={() => setSelectedBooking(b)} style={{ padding: '0.8rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', cursor: 'pointer' }}>{b.date}</td>
                  <td onClick={() => setSelectedBooking(b)} style={{ padding: '0.8rem 1rem', color: b.destination ? 'var(--text-accent)' : 'var(--text-muted)', cursor: 'pointer' }}>{b.destination ?? '—'}</td>
                  <td onClick={() => setSelectedBooking(b)} style={{ padding: '0.8rem 1rem', color: 'var(--text-muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}>{b.subject}</td>
                  {!isMobile && (
                    <td onClick={() => setSelectedBooking(b)} style={{ padding: '0.8rem 1rem', color: 'var(--text)', cursor: 'pointer' }}>{b.domain}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', padding: '0.875rem 1.5rem', borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              title="First page"
              style={{ fontSize: '0.75rem', color: page === 1 ? 'var(--text-muted)' : 'var(--text-accent)', background: 'none', border: 'none', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1, padding: '0.25rem 0.4rem' }}
            >
              «
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ fontSize: '0.75rem', color: page === 1 ? 'var(--text-muted)' : 'var(--text-accent)', background: 'none', border: 'none', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1, padding: '0.25rem 0.4rem' }}
            >
              ‹
            </button>
            {getPageNumbers(page, totalPages).map((p, i) =>
              p === '...'
                ? <span key={`ellipsis-${i}`} style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '0.25rem 0.2rem' }}>…</span>
                : <button
                    key={p}
                    onClick={() => setPage(p)}
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: p === page ? 600 : 400,
                      color: p === page ? 'var(--text)' : 'var(--text-muted)',
                      background: p === page ? 'rgba(255,255,255,0.08)' : 'none',
                      border: p === page ? '1px solid var(--border)' : 'none',
                      borderRadius: 'var(--radius-sm)',
                      cursor: p === page ? 'default' : 'pointer',
                      padding: '0.2rem 0.5rem',
                      minWidth: 28,
                    }}
                  >
                    {p}
                  </button>
            )}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ fontSize: '0.75rem', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-accent)', background: 'none', border: 'none', cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1, padding: '0.25rem 0.4rem' }}
            >
              ›
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              title="Last page"
              style={{ fontSize: '0.75rem', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-accent)', background: 'none', border: 'none', cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1, padding: '0.25rem 0.4rem' }}
            >
              »
            </button>
          </div>
        )}
      </div>

      {/* Platforms */}
      {platforms.length > 0 && (
        <div className="fade-up glass" style={{ borderRadius: 'var(--radius-xl)', padding: '1.25rem 1.5rem', marginTop: '1.5rem' }}>
          <div
            onClick={() => setPlatformsOpen(o => !o)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}
          >
            <h2 style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
              Platforms <span style={{ fontWeight: 400, opacity: 0.6 }}>({platforms.length})</span>
            </h2>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', transition: 'transform 150ms', display: 'inline-block', transform: platformsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
          </div>
          {platformsOpen && (
            <div style={{ marginTop: '0.875rem' }}>
              <input
                type="text"
                placeholder="Filter platforms…"
                value={platformSearch}
                onChange={e => setPlatformSearch(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '0.4rem 0.75rem',
                  marginBottom: '0.75rem',
                  fontSize: '0.78rem',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text)',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: 180, overflowY: 'auto' }}>
                {platforms
                  .filter(([domain]) => domain.toLowerCase().includes(platformSearch.toLowerCase()))
                  .map(([domain, count]) => (
                    <span key={domain} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.3rem 0.75rem',
                      borderRadius: 'var(--radius-md)',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid var(--border)',
                      fontSize: '0.78rem', color: 'var(--text)',
                      flexShrink: 0,
                    }}>
                      {domain}
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{count}</span>
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedBooking && (
        <BookingModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div style={{ padding: '88px 1.5rem 4rem', maxWidth: 760, margin: '0 auto' }}>
      <div style={{ height: 28, width: 120, marginBottom: '2rem' }} className="skeleton" />
      <div style={{ height: 48, width: '60%', marginBottom: '0.75rem' }} className="skeleton" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', margin: '2rem 0' }}>
        {[...Array(4)].map((_, i) => <div key={i} style={{ height: 80 }} className="skeleton" />)}
      </div>
      <div style={{ height: 300 }} className="skeleton" />
    </div>
  )
}

export default function ScanResultsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ScanResultsContent />
    </Suspense>
  )
}
