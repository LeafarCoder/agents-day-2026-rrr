import { Suspense } from 'react'
import TripDetailClient from './TripDetailClient'

export const runtime = 'edge'

export default function TripDetailPage() {
  return (
    <Suspense>
      <TripDetailClient />
    </Suspense>
  )
}
