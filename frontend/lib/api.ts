export interface Stop {
  productCode: string
  title: string
  description: string
  pricing: {
    summary: {
      fromPrice: number
    }
    currency: string
  }
  reviews: {
    combinedAverageRating: number
    totalReviews: number
  }
  images: Array<{
    variants: Array<{
      url: string
    }>
  }>
  productUrl: string
  walk_minutes_to_next: number
  available_start_time: string
  why_youll_love_it: string
  is_serendipity?: boolean
  serendipity_reason?: string
}

export interface ItineraryResult {
  city_name: string
  neighborhood: string
  stops: Stop[]
  serendipity_pick: Stop | null
  generated_at: string
}

export interface RunStatus {
  id: string
  session_id: string
  status: 'running' | 'done' | 'error'
  steps: string[]
  result: ItineraryResult | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export async function startRun(
  lat: number,
  lng: number,
  sessionId: string
): Promise<string> {
  const response = await fetch(`${API_URL}/api/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      latitude: lat,
      longitude: lng,
      session_id: sessionId,
    }),
  })

  if (!response.ok) {
    throw new Error(`Failed to start run: ${response.statusText}`)
  }

  const data = await response.json()
  return data.run_id as string
}

export async function pollRun(runId: string): Promise<RunStatus> {
  const response = await fetch(`${API_URL}/api/runs/${runId}`)

  if (!response.ok) {
    throw new Error(`Failed to poll run: ${response.statusText}`)
  }

  return response.json() as Promise<RunStatus>
}

export async function warmBackend(): Promise<void> {
  try {
    await fetch(`${API_URL}/healthz`)
  } catch {
    // fire and forget — swallow errors
  }
}
