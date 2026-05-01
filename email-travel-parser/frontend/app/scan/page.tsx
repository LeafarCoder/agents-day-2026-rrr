'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { API_URL } from '@/lib/api'

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
}
type ScanData = { profile: Profile | null; bookings: Booking[] }

function flagEmoji(code: string) {
  return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
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
        className="glass fade-in"
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

export default function ScanResultsPage() {
  const [data, setData] = useState<ScanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  useEffect(() => {
    fetch(`${API_URL}/api/scan`, { credentials: 'include' })
      .then(r => {
        if (r.status === 401) { window.location.href = '/'; return null }
        return r.json()
      })
      .then(d => { if (d) setData(d) })
      .catch(() => setError('Failed to load results.'))
      .finally(() => setLoading(false))
  }, [])

  /* ── Loading ──────────────────────────────────────────────────── */
  if (loading) {
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

  if (error) {
    return (
      <div style={{ padding: '88px 1.5rem', maxWidth: 760, margin: '0 auto' }}>
        <p style={{ color: '#f87171', fontSize: '0.9rem' }}>{error}</p>
      </div>
    )
  }

  const { profile, bookings = [] } = data ?? { profile: null, bookings: [] }
  const platforms = profile?.platforms ? Object.entries(profile.platforms) : []

  const PAGE_SIZE = 25
  const totalPages = Math.max(1, Math.ceil(bookings.length / PAGE_SIZE))
  const pageBookings = bookings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  /* ── Empty state ──────────────────────────────────────────────── */
  if (!data || bookings.length === 0) {
    return (
      <div style={{ padding: '88px 1.5rem 4rem', maxWidth: 760, margin: '0 auto' }}>
        <Link href="/" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '2rem' }}>
          ← Back
        </Link>
        <div className="glass" style={{ borderRadius: 'var(--radius-xl)', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🗺️</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--text)', marginBottom: '0.5rem' }}>No results yet</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Run a scan from your profile page to see booking history here.</p>
          <Link href="/" className="btn btn-primary">Go to Profile</Link>
        </div>
      </div>
    )
  }

  /* ── Results ──────────────────────────────────────────────────── */
  return (
    <div style={{ padding: '88px 1.5rem 4rem', maxWidth: 760, margin: '0 auto' }}>

      {/* Header */}
      <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <Link href="/" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.75rem' }}>
            ← Profile
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.15 }}>
            Scan Results
          </h1>
        </div>
        {profile?.last_scanned && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '2rem', flexShrink: 0 }}>
            {new Date(profile.last_scanned).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        )}
      </div>

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

      {/* Platforms */}
      {platforms.length > 0 && (
        <div className="fade-up d-200 glass" style={{ borderRadius: 'var(--radius-xl)', padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>
            Platforms
          </h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {platforms.map(([domain, count]) => (
              <span key={domain} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.3rem 0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                fontSize: '0.78rem', color: 'var(--text)',
              }}>
                {domain}
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bookings table */}
      <div className="fade-up d-300 glass" style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            Confirmations <span style={{ fontWeight: 400, opacity: 0.6 }}>({bookings.length})</span>
          </h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Date', 'Platform', 'Destination', 'Subject'].map(h => (
                  <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageBookings.map((b, i) => (
                <tr
                  key={i}
                  onClick={() => setSelectedBooking(b)}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 150ms', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.8rem 1rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{b.date}</td>
                  <td style={{ padding: '0.8rem 1rem', color: 'var(--text)' }}>{b.domain}</td>
                  <td style={{ padding: '0.8rem 1rem', color: b.destination ? 'var(--text-accent)' : 'var(--text-muted)' }}>{b.destination ?? '—'}</td>
                  <td style={{ padding: '0.8rem 1rem', color: 'var(--text-muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.subject}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1.5rem', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ fontSize: '0.78rem', color: page === 1 ? 'var(--text-muted)' : 'var(--text-accent)', background: 'none', border: 'none', cursor: page === 1 ? 'default' : 'pointer', opacity: page === 1 ? 0.4 : 1, padding: '0.25rem 0' }}
            >
              ← Prev
            </button>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ fontSize: '0.78rem', color: page === totalPages ? 'var(--text-muted)' : 'var(--text-accent)', background: 'none', border: 'none', cursor: page === totalPages ? 'default' : 'pointer', opacity: page === totalPages ? 0.4 : 1, padding: '0.25rem 0' }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {selectedBooking && (
        <BookingModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      )}
    </div>
  )
}
