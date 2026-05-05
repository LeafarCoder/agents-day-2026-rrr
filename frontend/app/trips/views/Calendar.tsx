'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useIsMobile } from '@/lib/useIsMobile'
import { buildTripDayIndex, isoDate } from '@/lib/tripTime'

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

function tripLabel(trip: Trip) {
  return (trip.country_code ? flag(trip.country_code) + ' ' : '') + (trip.city_name || trip.country_name || trip.title || 'Trip')
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_HEADERS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayOfWeek(year: number, month: number) {
  // Monday-first: 0=Mon … 6=Sun
  const d = new Date(year, month, 1).getDay()
  return (d + 6) % 7
}

type CellSpan = { trip: Trip; startCol: number; endCol: number; rowStart: boolean; rowEnd: boolean }

function buildWeekSpans(
  year: number,
  month: number,
  dayIndex: Map<string, Trip[]>,
): Map<number, CellSpan[]>[] {
  // Returns array of week rows, each a Map<weekday 0-6, CellSpan[]>
  const offset   = firstDayOfWeek(year, month)
  const total    = daysInMonth(year, month)

  // Collect all cells (dayOfMonth 1..total, col 0..6)
  const cells: { day: number; col: number; week: number }[] = []
  for (let d = 1; d <= total; d++) {
    const pos  = offset + d - 1
    cells.push({ day: d, col: pos % 7, week: Math.floor(pos / 7) })
  }

  const weekCount = Math.ceil((offset + total) / 7)
  const rows: Map<number, CellSpan[]>[] = Array.from({ length: weekCount }, () => new Map())

  // For each trip that touches this month, build spans per week row
  const seen = new Set<string>()
  for (const cell of cells) {
    const iso   = isoDate(new Date(year, month, cell.day))
    const trips = dayIndex.get(iso) ?? []
    for (const trip of trips) {
      if (seen.has(trip.id + '-' + cell.week)) continue
      seen.add(trip.id + '-' + cell.week)

      const tripStart = trip.start_date ? new Date(trip.start_date + 'T00:00:00') : null
      const tripEnd   = trip.end_date   ? new Date(trip.end_date   + 'T00:00:00') : tripStart

      // Find startCol and endCol within this week row
      const weekCells = cells.filter(c => c.week === cell.week)
      const startCol = weekCells[0].col
      const endCol   = weekCells[weekCells.length - 1].col

      // Actual trip start/end within this week
      let sc = startCol
      let ec = endCol
      for (const wc of weekCells) {
        const d = new Date(year, month, wc.day)
        if (tripStart && d < tripStart) sc = wc.col + 1
        if (tripEnd   && d > tripEnd)   ec = wc.col - 1
      }
      if (sc > ec) continue

      // Does the trip start/end in this month on this week?
      const rowStart = tripStart ? (
        tripStart.getFullYear() === year &&
        tripStart.getMonth()    === month &&
        tripStart.getDate()     >= weekCells[0].day &&
        tripStart.getDate()     <= weekCells[weekCells.length - 1].day
      ) : false
      const rowEnd = tripEnd ? (
        tripEnd.getFullYear() === year &&
        tripEnd.getMonth()    === month &&
        tripEnd.getDate()     >= weekCells[0].day &&
        tripEnd.getDate()     <= weekCells[weekCells.length - 1].day
      ) : false

      const rowMap = rows[cell.week]
      const existing = rowMap.get(sc) ?? []
      existing.push({ trip, startCol: sc, endCol: ec, rowStart, rowEnd })
      rowMap.set(sc, existing)
    }
  }

  return rows
}

export default function Calendar({ trips }: { trips: Trip[] }) {
  const isMobile = useIsMobile()
  const now = new Date()
  const [year,  setYear]  = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const dayIndex = useMemo(() => buildTripDayIndex(trips), [trips])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }
  function goToday() { setYear(now.getFullYear()); setMonth(now.getMonth()) }

  const offset   = firstDayOfWeek(year, month)
  const total    = daysInMonth(year, month)
  const prevTotal = daysInMonth(month === 0 ? year - 1 : year, month === 0 ? 11 : month - 1)
  const weekSpans = useMemo(() => buildWeekSpans(year, month, dayIndex), [year, month, dayIndex])
  const weekCount = Math.ceil((offset + total) / 7)
  const todayIso  = isoDate(now)

  if (trips.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        No trips yet.{' '}
        <Link href="/email-scan" style={{ color: 'var(--text-accent)', textDecoration: 'none' }}>Scan your emails →</Link>
      </div>
    )
  }

  // ── Mobile: vertical day list ──────────────────────────────────────────
  if (isMobile) {
    const daysWithTrips: { day: number; trips: Trip[] }[] = []
    for (let d = 1; d <= total; d++) {
      const iso = isoDate(new Date(year, month, d))
      const ts  = dayIndex.get(iso)
      if (ts?.length) daysWithTrips.push({ day: d, trips: ts })
    }
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', padding: '0.25rem 0.5rem' }}>‹</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem' }}>{MONTH_NAMES[month]} {year}</span>
            <button onClick={goToday} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.15rem 0.4rem', cursor: 'pointer' }}>Today</button>
          </div>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', padding: '0.25rem 0.5rem' }}>›</button>
        </div>
        {daysWithTrips.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem', padding: '1.5rem 0' }}>No trips this month.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {daysWithTrips.map(({ day, trips: ts }) => (
              <div key={day} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ width: 28, flexShrink: 0, textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: '0.3rem' }}>{day}</div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {ts.map(t => (
                    <Link key={t.id} href={`/trips/${t.id}`} style={{ textDecoration: 'none', fontSize: '0.78rem', color: 'var(--text)', background: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.22)', borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.5rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tripLabel(t)}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── Desktop 7-column grid ──────────────────────────────────────────────
  const CELL_H = 80

  return (
    <div>
      {/* Header controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '0.2rem 0.5rem' }}>‹</button>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '0.2rem 0.5rem' }}>›</button>
          <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95rem', marginLeft: '0.25rem' }}>
            {MONTH_NAMES[month]} {year}
          </span>
        </div>
        <button onClick={goToday} style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.25rem 0.6rem', cursor: 'pointer' }}>
          Today
        </button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
        {DAY_HEADERS.map(h => (
          <div key={h} style={{ padding: '0.3rem 0.5rem', fontSize: '0.65rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', textAlign: 'center' }}>{h}</div>
        ))}
      </div>

      {/* Week rows */}
      {Array.from({ length: weekCount }, (_, weekIdx) => {
        const spans: CellSpan[] = []
        weekSpans[weekIdx]?.forEach(arr => spans.push(...arr))

        return (
          <div key={weekIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid rgba(255,255,255,0.04)', position: 'relative', minHeight: CELL_H }}>
            {/* Day cells */}
            {Array.from({ length: 7 }, (_, col) => {
              const pos     = weekIdx * 7 + col
              const dayNum  = pos - offset + 1
              const isThisM = dayNum >= 1 && dayNum <= total
              const iso     = isThisM ? isoDate(new Date(year, month, dayNum)) : null
              const isToday = iso === todayIso
              let displayDay: number
              if (!isThisM) {
                if (pos < offset) displayDay = prevTotal - offset + pos + 1
                else              displayDay = dayNum - total
              } else {
                displayDay = dayNum
              }
              return (
                <div
                  key={col}
                  style={{
                    borderRight: col < 6 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    padding: '0.35rem 0.4rem 0.25rem',
                    minHeight: CELL_H,
                    opacity: isThisM ? 1 : 0.3,
                  }}
                >
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: isToday ? 700 : 400,
                    color: isToday ? 'var(--text-accent)' : 'var(--text-muted)',
                    background: isToday ? 'rgba(0,212,170,0.12)' : 'transparent',
                    borderRadius: '50%',
                    width: 20, height: 20,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {displayDay}
                  </span>
                </div>
              )
            })}

            {/* Trip bars overlaid on the row */}
            {spans.map(({ trip, startCol, endCol, rowStart, rowEnd }, si) => {
              const left   = `calc(${startCol / 7 * 100}% + 2px)`
              const width  = `calc(${(endCol - startCol + 1) / 7 * 100}% - 4px)`
              return (
                <Link
                  key={trip.id + si}
                  href={`/trips/${trip.id}`}
                  style={{
                    position: 'absolute',
                    top: 28 + si * 22,
                    left,
                    width,
                    height: 20,
                    textDecoration: 'none',
                    background: 'rgba(0,212,170,0.15)',
                    border: '1px solid rgba(0,212,170,0.3)',
                    borderLeft:  rowStart ? '1px solid rgba(0,212,170,0.5)' : 'none',
                    borderRight: rowEnd   ? '1px solid rgba(0,212,170,0.5)' : 'none',
                    borderRadius: rowStart && rowEnd ? 4 : rowStart ? '4px 0 0 4px' : rowEnd ? '0 4px 4px 0' : 0,
                    display: 'flex', alignItems: 'center',
                    paddingLeft: rowStart ? '0.35rem' : '0.15rem',
                    overflow: 'hidden',
                    zIndex: si + 1,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,170,0.28)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,212,170,0.15)' }}
                >
                  {rowStart && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {tripLabel(trip)}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
