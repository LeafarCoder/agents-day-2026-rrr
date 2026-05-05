'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { buildTripDayIndex, tripYears, isoDate } from '@/lib/tripTime'

type Trip = {
  id: string
  title: string | null
  start_date: string | null
  end_date: string | null
  city_name: string | null
  country_name: string | null
  country_code: string | null
  email_count: number
}

function flag(code: string) {
  return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}

function tripLabel(trip: Trip) {
  return (trip.country_code ? flag(trip.country_code) + ' ' : '') + (trip.city_name || trip.country_name || trip.title || 'Trip')
}

type CellInfo = {
  iso: string
  travelCount: number
  trips: Trip[]
  bookingCount: number
}

function buildYearGrid(year: number, dayIndex: Map<string, Trip[]>, emailDayIndex: Map<string, number>): CellInfo[][] {
  // 53 columns × 7 rows (Sun=0 in JS but we want Mon=0)
  // We'll build all days of the year in order
  const jan1   = new Date(year, 0, 1)
  const dec31  = new Date(year, 11, 31)
  // Monday-first offset for Jan 1
  const startOffset = (jan1.getDay() + 6) % 7  // 0=Mon

  // Build 53×7 grid, row=weekday(0=Mon), col=week
  const grid: CellInfo[][] = Array.from({ length: 7 }, () => [])
  let   cur    = new Date(jan1)
  cur.setDate(cur.getDate() - startOffset)

  for (let col = 0; col < 53; col++) {
    for (let row = 0; row < 7; row++) {
      const iso    = isoDate(cur)
      const inYear = cur >= jan1 && cur <= dec31
      const trips  = inYear ? (dayIndex.get(iso) ?? []) : []
      grid[row].push({
        iso,
        travelCount:  trips.length,
        trips,
        bookingCount: inYear ? (emailDayIndex.get(iso) ?? 0) : 0,
      })
      cur.setDate(cur.getDate() + 1)
    }
  }
  return grid
}

export default function Heatmap({ trips }: { trips: Trip[] }) {
  const years = useMemo(() => tripYears(trips), [trips])
  const [selectedYear, setSelectedYear] = useState(() => {
    const y = new Date().getFullYear()
    return years.includes(y) ? y : years[years.length - 1] ?? y
  })
  const [metric, setMetric] = useState<'travel' | 'bookings'>('travel')
  const [tooltip, setTooltip] = useState<{ cell: CellInfo; x: number; y: number } | null>(null)

  const dayIndex = useMemo(() => buildTripDayIndex(trips), [trips])

  // Build booking-date index (email_date → count of emails)
  const emailDayIndex = useMemo(() => {
    // We don't have email-level data here, so this is a placeholder.
    // In the future, email dates could be passed separately.
    return new Map<string, number>()
  }, [])

  const grid = useMemo(() => buildYearGrid(selectedYear, dayIndex, emailDayIndex), [selectedYear, dayIndex, emailDayIndex])

  const todayIso = isoDate(new Date())

  function cellColor(cell: CellInfo): string {
    const count = metric === 'travel' ? cell.travelCount : cell.bookingCount
    if (count === 0) return 'rgba(255,255,255,0.05)'
    const alpha = Math.min(0.15 + count * 0.22, 1)
    return `rgba(0,212,170,${alpha.toFixed(2)})`
  }

  if (trips.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
        No trips yet.{' '}
        <Link href="/email-scan" style={{ color: 'var(--text-accent)', textDecoration: 'none' }}>Scan your emails →</Link>
      </div>
    )
  }

  const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const DAY_LABELS = ['Mon','','Wed','','Fri','','Sun']

  // Month label positions: find first col where the month changes
  const monthPositions: { month: number; col: number }[] = []
  if (grid[0]) {
    let lastMonth = -1
    grid[0].forEach((cell, col) => {
      const d = new Date(cell.iso + 'T00:00:00')
      if (d.getFullYear() === selectedYear && d.getMonth() !== lastMonth) {
        monthPositions.push({ month: d.getMonth(), col })
        lastMonth = d.getMonth()
      }
    })
  }

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={() => setSelectedYear(y => { const idx = years.indexOf(y); return idx > 0 ? years[idx - 1] : y })}
            disabled={years.indexOf(selectedYear) === 0}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', padding: '0.2rem 0.4rem', opacity: years.indexOf(selectedYear) === 0 ? 0.3 : 1 }}
          >‹</button>
          <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem', minWidth: 40, textAlign: 'center' }}>{selectedYear}</span>
          <button
            onClick={() => setSelectedYear(y => { const idx = years.indexOf(y); return idx < years.length - 1 ? years[idx + 1] : y })}
            disabled={years.indexOf(selectedYear) === years.length - 1}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem', padding: '0.2rem 0.4rem', opacity: years.indexOf(selectedYear) === years.length - 1 ? 0.3 : 1 }}
          >›</button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', background: 'rgba(255,255,255,0.04)', borderRadius: 'var(--radius-md)', padding: '0.2rem', border: '1px solid var(--border)' }}>
          {(['travel', 'bookings'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              style={{
                fontSize: '0.72rem', fontWeight: 500, padding: '0.2rem 0.65rem',
                borderRadius: 'var(--radius-sm)', border: 'none', cursor: 'pointer',
                background: metric === m ? 'rgba(0,212,170,0.15)' : 'transparent',
                color: metric === m ? 'var(--text-accent)' : 'var(--text-muted)',
              }}
            >
              {m === 'travel' ? 'Travel days' : 'Bookings made'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {/* Month labels */}
          <div style={{ display: 'flex', marginLeft: 28, marginBottom: 4, position: 'relative', height: 16 }}>
            {monthPositions.map(({ month, col }) => (
              <div
                key={month}
                style={{
                  position: 'absolute',
                  left: col * 12,
                  fontSize: '0.62rem',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                {MONTH_ABBR[month]}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 0 }}>
            {/* Day-of-week labels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginRight: 4 }}>
              {DAY_LABELS.map((label, i) => (
                <div key={i} style={{ height: 10, fontSize: '0.58rem', color: 'var(--text-muted)', lineHeight: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {label}
                </div>
              ))}
            </div>

            {/* Columns */}
            <div style={{ display: 'flex', gap: 2 }}>
              {grid[0]?.map((_, col) => (
                <div key={col} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {grid.map((row, rowIdx) => {
                    const cell    = row[col]
                    const isToday = cell.iso === todayIso
                    const hasSomething = metric === 'travel' ? cell.travelCount > 0 : cell.bookingCount > 0
                    const inYear  = cell.iso.startsWith(String(selectedYear))

                    return (
                      <div
                        key={rowIdx}
                        style={{
                          width: 10, height: 10,
                          borderRadius: 2,
                          background: inYear ? cellColor(cell) : 'transparent',
                          border: isToday ? '1px solid rgba(0,212,170,0.6)' : '1px solid transparent',
                          cursor: hasSomething && inYear ? 'pointer' : 'default',
                          flexShrink: 0,
                          transition: 'background 100ms',
                        }}
                        onMouseEnter={e => {
                          if (!inYear) return
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                          setTooltip({ cell, x: rect.left + 5, y: rect.top - 8 })
                        }}
                        onMouseLeave={() => setTooltip(null)}
                        onClick={() => {
                          if (cell.trips.length > 0) {
                            window.location.href = `/trips/${cell.trips[cell.trips.length - 1].id}`
                          }
                        }}
                      />
                    )
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>Less</span>
            {[0, 1, 2, 3, 4].map(v => (
              <div key={v} style={{ width: 10, height: 10, borderRadius: 2, background: v === 0 ? 'rgba(255,255,255,0.05)' : `rgba(0,212,170,${(0.15 + v * 0.22).toFixed(2)})` }} />
            ))}
            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>More</span>
          </div>
        </div>
      </div>

      {/* Tooltip (fixed to viewport) */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 100,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '0.4rem 0.65rem',
            fontSize: '0.72rem',
            color: 'var(--text)',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2 }}>
            {new Date(tooltip.cell.iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          {tooltip.cell.trips.length > 0 ? (
            tooltip.cell.trips.map(t => (
              <div key={t.id} style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{tripLabel(t)}</div>
            ))
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>No active trip</div>
          )}
        </div>
      )}
    </div>
  )
}
