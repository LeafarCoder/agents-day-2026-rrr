'use client'

import { Stop } from '@/lib/api'

interface ItineraryCardProps {
  stop: Stop
  index: number
  showWalkTime: boolean
}

function StarRating({ rating }: { rating: number }) {
  const rounded = Math.round(rating * 10) / 10
  return (
    <span className="text-amber-400 font-semibold text-sm">
      ★ {rounded.toFixed(1)}
    </span>
  )
}

function formatTime(timeString: string): string {
  // e.g. "14:00:00" → "14:00"
  const parts = timeString.split(':')
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`
  }
  return timeString
}

export default function ItineraryCard({ stop, index, showWalkTime }: ItineraryCardProps) {
  const imageUrl =
    stop.images?.[0]?.variants?.[0]?.url ?? null

  const fromPrice = stop.pricing?.summary?.fromPrice ?? null
  const currency = stop.pricing?.currency ?? 'EUR'

  const currencySymbol: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
  }
  const symbol = currencySymbol[currency] ?? currency

  return (
    <div className="rounded-2xl overflow-hidden bg-gray-900 border border-gray-800 flex flex-col">
      {/* Hero image */}
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt={stop.title}
          className="w-full object-cover"
          style={{ height: '180px' }}
        />
      ) : (
        <div
          className="w-full flex items-center justify-center"
          style={{
            height: '180px',
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          }}
        >
          <span className="text-5xl">🗺️</span>
        </div>
      )}

      {/* Body */}
      <div className="p-4 flex flex-col gap-3">
        {/* Stop number badge */}
        <div className="flex items-center gap-2">
          <span className="bg-amber-500 text-black text-xs font-bold px-2.5 py-1 rounded-full">
            Stop {index + 1}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-white leading-snug">{stop.title}</h3>

        {/* Stars + reviews */}
        {stop.reviews?.combinedAverageRating != null && (
          <div className="flex items-center gap-2">
            <StarRating rating={stop.reviews.combinedAverageRating} />
            <span className="text-gray-500 text-sm">
              ({stop.reviews.totalReviews?.toLocaleString() ?? 0} reviews)
            </span>
          </div>
        )}

        {/* Price */}
        {fromPrice != null && (
          <p className="text-amber-400 font-semibold text-base">
            from {symbol}{fromPrice}
          </p>
        )}

        {/* Why you'll love it */}
        {stop.why_youll_love_it && (
          <p className="text-gray-400 text-sm italic leading-relaxed">
            &ldquo;{stop.why_youll_love_it}&rdquo;
          </p>
        )}

        {/* Start time */}
        {stop.available_start_time && (
          <div className="inline-flex">
            <span className="bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-full">
              Starts {formatTime(stop.available_start_time)}
            </span>
          </div>
        )}

        {/* Book button */}
        <a
          href={stop.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-amber-500 text-black font-semibold py-3 rounded-xl text-center text-sm hover:bg-amber-400 active:scale-95 transition-all duration-150 mt-1"
        >
          Book on Viator →
        </a>
      </div>

      {/* Walk time footer */}
      {showWalkTime && stop.walk_minutes_to_next > 0 && (
        <div className="px-4 pb-4">
          <div className="border-t border-gray-800 pt-3">
            <p className="text-gray-500 text-xs text-center">
              🚶 ~{stop.walk_minutes_to_next} min walk to next stop
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
