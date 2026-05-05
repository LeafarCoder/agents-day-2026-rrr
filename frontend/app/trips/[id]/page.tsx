import { Suspense } from 'react'
import TripDetailClient from './TripDetailClient'

export default function TripDetailPage() {
  return (
    <Suspense>
      <TripDetailClient />
    </Suspense>
  )
}
