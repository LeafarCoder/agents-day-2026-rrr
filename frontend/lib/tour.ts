import { API_URL } from './api'

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center'

export type TourStep = {
  id: string
  target: string
  title: string
  body: string
  placement: TourPlacement
  optional?: boolean
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'greeting',
    target: '[data-tour="greeting"]',
    title: 'Welcome to Travel DNA',
    body: 'This is your dashboard — a snapshot of where you have been and what you love doing on trips.',
    placement: 'bottom',
  },
  {
    id: 'stats',
    target: '[data-tour="stats"]',
    title: 'Your numbers at a glance',
    body: 'Emails parsed, countries visited, and activity preferences detected — all from your inbox.',
    placement: 'bottom',
  },
  {
    id: 'world-map',
    target: '[data-tour="world-map"]',
    title: 'Your world, mapped',
    body: 'Every country and city you have travelled to. Click a marker to dive into a city.',
    placement: 'top',
    optional: true,
  },
  {
    id: 'places',
    target: '[data-tour="places"]',
    title: 'Slice your trips your way',
    body: 'Group by country, year, continent, or season. Click any city for the trip details.',
    placement: 'top',
    optional: true,
  },
  {
    id: 'preferences',
    target: '[data-tour="preferences"]',
    title: 'Your activity DNA',
    body: 'The categories that show up most across your bookings. Expand any one to see the keywords behind it.',
    placement: 'top',
    optional: true,
  },
  {
    id: 'account',
    target: '[data-tour="nav-account"]',
    title: 'Tweak anything from Account',
    body: 'Update your profile, manage your API key, or replay this tour any time.',
    placement: 'bottom',
  },
]

const TOUR_SEEN_KEY = 'travel-dna.tour-seen.v1'

export function getTourSeenCached(): boolean {
  try { return localStorage.getItem(TOUR_SEEN_KEY) === '1' } catch { return false }
}

export function setTourSeenCached(v: boolean): void {
  try { v ? localStorage.setItem(TOUR_SEEN_KEY, '1') : localStorage.removeItem(TOUR_SEEN_KEY) } catch {}
}

export async function postTourComplete(): Promise<void> {
  await fetch(`${API_URL}/api/settings/tour-complete`, { method: 'POST', credentials: 'include' })
}

export async function postTourReset(): Promise<void> {
  await fetch(`${API_URL}/api/settings/tour-reset`, { method: 'POST', credentials: 'include' })
}
