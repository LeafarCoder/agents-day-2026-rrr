'use client'

import { Stop } from '@/lib/api'

interface SerendipityCardProps {
  stop: Stop
}

function StarRating({ rating }: { rating: number }) {
  const rounded = Math.round(rating * 10) / 10
  return (
    <span className="text-violet-400 font-semibold text-sm">
      ★ {rounded.toFixed(1)}
    </span>
  )
}

function formatTime(timeString: string): string {
  const parts = timeString.split(':')
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`
  }
  return timeString
}

export default function SerendipityCard({ stop }: SerendipityCardProps) {
  const imageUrl = stop.images?.[0]?.variants?.[0]?.url ?? null

  const fromPrice = stop.pricing?.summary?.fromPrice ?? null
  const currency = stop.pricing?.currency ?? 'EUR'

  const currencySymbol: Record<string, string> = {
    EUR: '€',
    USD: '$',
    GBP: '£',
  }
  const symbol = currencySymbol[currency] ?? currency

  return (
    <div className="rounded-2xl overflow-hidden bg-gray-900 border border-violet-700/50 flex flex-col">
      {/* Surprise header banner */}
      <div className="bg-violet-900/50 border-b border-violet-700/40 px-4 py-3 flex items-center gap-2">
        <span className="text-lg">✨</span>
        <span className="text-violet-300 font-semibold text-sm">Surprise pick</span>
        <span className="ml-auto text-violet-400/60 text-xs">Just for you</span>
      </div>

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
            background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)',
          }}
        >
          <span className="text-5xl">✨</span>
        </div>
      )}

      {/* Body */}
      <div className="p-4 flex flex-col gap-3">
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
          <p className="text-violet-400 font-semibold text-base">
            from {symbol}{fromPrice}
          </p>
        )}

        {/* Serendipity reason */}
        {stop.serendipity_reason && (
          <div className="bg-violet-900/30 border border-violet-700/30 rounded-xl px-3 py-2">
            <p className="text-violet-300 text-sm leading-relaxed">
              {stop.serendipity_reason}
            </p>
          </div>
        )}

        {/* Why you'll love it fallback */}
        {!stop.serendipity_reason && stop.why_youll_love_it && (
          <p className="text-gray-400 text-sm italic leading-relaxed">
            &ldquo;{stop.why_youll_love_it}&rdquo;
          </p>
        )}

        {/* Start time */}
        {stop.available_start_time && (
          <div className="inline-flex">
            <span className="bg-violet-900/40 text-violet-300 text-xs px-2.5 py-1 rounded-full border border-violet-700/30">
              Starts {formatTime(stop.available_start_time)}
            </span>
          </div>
        )}

        {/* Book button */}
        <a
          href={stop.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-violet-600 text-white font-semibold py-3 rounded-xl text-center text-sm hover:bg-violet-500 active:scale-95 transition-all duration-150 mt-1"
        >
          Book on Viator →
        </a>
      </div>
    </div>
  )
}
