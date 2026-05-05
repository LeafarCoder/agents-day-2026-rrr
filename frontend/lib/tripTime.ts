export type TripForIndex = {
  id: string
  start_date: string | null
  end_date: string | null
  [key: string]: unknown
}

/** O(total_trip_days) once; O(1) lookup per cell. */
export function buildTripDayIndex<T extends TripForIndex>(trips: T[]): Map<string, T[]> {
  const index = new Map<string, T[]>()
  for (const trip of trips) {
    if (!trip.start_date) continue
    const start = new Date(trip.start_date + 'T00:00:00')
    const end   = trip.end_date ? new Date(trip.end_date + 'T00:00:00') : start
    const cur   = new Date(start)
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10)
      const bucket = index.get(key)
      if (bucket) {
        bucket.push(trip)
      } else {
        index.set(key, [trip])
      }
      cur.setDate(cur.getDate() + 1)
    }
  }
  return index
}

export function tripYears<T extends TripForIndex>(trips: T[]): number[] {
  if (trips.length === 0) return [new Date().getFullYear()]
  const years = new Set<number>()
  for (const t of trips) {
    if (t.start_date) years.add(parseInt(t.start_date.slice(0, 4)))
    if (t.end_date)   years.add(parseInt(t.end_date.slice(0, 4)))
  }
  const sorted = [...years].sort((a, b) => a - b)
  return sorted
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
