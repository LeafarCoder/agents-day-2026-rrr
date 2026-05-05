'use client'

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { useIsMobile } from '@/lib/useIsMobile'

type Trip = {
  id: string
  title: string | null
  start_date: string | null
  end_date: string | null
  city_name: string | null
  country_name: string | null
  country_code: string | null
}

function flag(code: string) {
  return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}

function fmtShort(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function nightCount(start: string, end: string | null) {
  if (!end || end === start) return null
  const n = Math.round((new Date(end + 'T00:00:00').getTime() - new Date(start + 'T00:00:00').getTime()) / 86400000)
  return n > 0 ? n : null
}

export default function Timeline({ trips }: { trips: Trip[] }) {
  const isMobile = useIsMobile()
  const [tooltip, setTooltip] = useState<{ trip: Trip; x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const { datedTrips, minMs, rangeMs, yearMarkers } = useMemo(() => {
    const dated = trips.filter(t => t.start_date).sort((a, b) => (a.start_date ?? '').localeCompare(b.start_date ?? ''))
    if (dated.length === 0) return { datedTrips: [], minMs: 0, rangeMs: 1, yearMarkers: [] }

    const minMs = new Date(dated[0].start_date! + 'T00:00:00').getTime()
    const now   = Date.now()
    const maxMs = Math.max(now, new Date((dated[dated.length - 1].end_date ?? dated[dated.length - 1].start_date)! + 'T00:00:00').getTime())
    const rangeMs = maxMs - minMs || 1

    const firstYear = new Date(minMs).getFullYear()
    const lastYear  = new Date(maxMs).getFullYear()
    const markers: { year: number; pct: number }[] = []
    for (let y = firstYear + 1; y <= lastYear; y++) {
      const ms  = new Date(`${y}-01-01T00:00:00`).getTime()
      const pct = (ms - minMs) / rangeMs * 100
      if (pct > 0 && pct < 100) markers.push({ year: y, pct })
    }
    return { datedTrips: dated, minMs, rangeMs, yearMarkers: markers }
  }, [trips])

  if (trips.length === 0 || datedTrips.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        No trips yet.{' '}
        <Link href="/email-scan" style={{ color: 'var(--text-accent)', textDecoration: 'none' }}>Scan your emails →</Link>
      </div>
    )
  }

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative', paddingLeft: '2.5rem' }}>
        {/* Vertical axis line */}
        <div style={{ position: 'absolute', left: '1.1rem', top: 0, bottom: 0, width: 2, background: 'var(--border)', borderRadius: 1 }} />

        {datedTrips.map((trip, i) => {
          const nights = nightCount(trip.start_date!, trip.end_date)
          const label  = trip.country_code ? flag(trip.country_code) + ' ' : ''
          return (
            <Link key={trip.id} href={`/trips/${trip.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'flex-start', gap: '0.75rem', paddingBottom: '1.5rem', position: 'relative' }}>
              {/* Dot */}
              <div style={{
                position: 'absolute', left: '-1.56rem', top: '0.25rem',
                width: nights ? 10 : 8, height: nights ? 10 : 8,
                borderRadius: '50%',
                background: 'var(--text-accent)',
                border: '2px solid var(--nav-surface)',
                flexShrink: 0,
              }} />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>
                  {label}{trip.city_name || trip.country_name || trip.title || 'Untitled'}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                  {fmtShort(trip.start_date!)}
                  {nights ? ` · ${nights}n` : ''}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    )
  }

  const yearsSpanned = Math.max(1, new Date(Date.now()).getFullYear() - new Date(minMs).getFullYear() + 1)
  const minPx  = yearsSpanned * 300
  const BAR_H  = 22
  const AXIS_H = 32

  return (
    <div
      ref={containerRef}
      style={{ overflowX: 'auto', overflowY: 'visible', paddingBottom: '0.5rem', cursor: 'default' }}
      onMouseLeave={() => setTooltip(null)}
    >
      <div style={{ minWidth: minPx, position: 'relative', height: datedTrips.length * (BAR_H + 8) + AXIS_H + 16 }}>

        {/* Year separators */}
        {yearMarkers.map(({ year, pct }) => (
          <div key={year} style={{ position: 'absolute', left: `${pct}%`, top: 0, bottom: AXIS_H, width: 1, background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }}>
            <span style={{ position: 'absolute', top: 0, left: 4, fontSize: '0.65rem', color: 'var(--text-muted)', opacity: 0.5, whiteSpace: 'nowrap' }}>{year}</span>
          </div>
        ))}

        {/* Trips */}
        {datedTrips.map((trip, i) => {
          const startMs = new Date(trip.start_date! + 'T00:00:00').getTime()
          const endMs   = trip.end_date ? new Date(trip.end_date + 'T00:00:00').getTime() : startMs
          const x0      = (startMs - minMs) / rangeMs * 100
          const x1      = (endMs   - minMs) / rangeMs * 100
          const w       = Math.max(0.4, x1 - x0)
          const isBar   = (endMs - startMs) > 86400000
          const top     = i * (BAR_H + 8)
          const nights  = nightCount(trip.start_date!, trip.end_date)
          const lbl     = (trip.country_code ? flag(trip.country_code) + ' ' : '') + (trip.city_name || trip.country_name || trip.title || 'Untitled')

          return (
            <Link
              key={trip.id}
              href={`/trips/${trip.id}`}
              style={{ textDecoration: 'none', position: 'absolute', top, left: `${x0}%`, width: `${w}%` }}
              onMouseEnter={e => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                const parentRect = containerRef.current?.getBoundingClientRect()
                setTooltip({
                  trip,
                  x: rect.left - (parentRect?.left ?? 0) + rect.width / 2,
                  y: top,
                })
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              {isBar ? (
                <div style={{
                  height: BAR_H, borderRadius: 5,
                  background: 'rgba(0,212,170,0.18)',
                  border: '1px solid rgba(0,212,170,0.35)',
                  display: 'flex', alignItems: 'center',
                  padding: '0 0.4rem',
                  overflow: 'hidden', whiteSpace: 'nowrap',
                  transition: 'background 150ms',
                  fontSize: '0.72rem', color: 'var(--text)',
                  minWidth: 4,
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,170,0.32)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,170,0.18)' }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{lbl}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14, marginLeft: -7 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--text-accent)', border: '2px solid var(--nav-surface)', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginTop: 2, maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis' }}>{lbl}</span>
                </div>
              )}
            </Link>
          )
        })}

        {/* Axis line */}
        <div style={{ position: 'absolute', bottom: AXIS_H, left: 0, right: 0, height: 1, background: 'var(--border)' }} />

        {/* Year labels on axis */}
        {yearMarkers.map(({ year, pct }) => (
          <div key={year} style={{ position: 'absolute', bottom: 4, left: `${pct}%`, transform: 'translateX(-50%)', fontSize: '0.65rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{year}</div>
        ))}
        {/* First year label */}
        <div style={{ position: 'absolute', bottom: 4, left: 0, fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          {new Date(minMs).getFullYear()}
        </div>
        <div style={{ position: 'absolute', bottom: 4, right: 0, fontSize: '0.65rem', color: 'var(--text-muted)' }}>
          Today
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (() => {
        const t = tooltip.trip
        const nights = nightCount(t.start_date!, t.end_date)
        return (
          <div style={{
            position: 'absolute', left: tooltip.x, top: tooltip.y - 8,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none', zIndex: 10,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.4rem 0.65rem',
            fontSize: '0.72rem',
            color: 'var(--text)',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}>
            <div style={{ fontWeight: 600 }}>{(t.country_code ? flag(t.country_code) + ' ' : '')}{t.city_name || t.country_name || t.title || 'Untitled'}</div>
            <div style={{ color: 'var(--text-muted)', marginTop: 2 }}>
              {fmtShort(t.start_date!)}
              {t.end_date && t.end_date !== t.start_date ? ` → ${fmtShort(t.end_date)}` : ''}
              {nights ? ` · ${nights} nights` : ''}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
