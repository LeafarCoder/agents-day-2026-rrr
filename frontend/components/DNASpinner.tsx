'use client'

import React, { useEffect, useState } from 'react'

type Props = {
  size?: number
  title?: string
}

export default function DNASpinner({ size = 84, title = 'Loading…' }: Props) {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
      setReduced(mq.matches)
      const handler = () => setReduced(mq.matches)
      if (mq.addEventListener) mq.addEventListener('change', handler)
      else mq.addListener(handler)
      return () => {
        if (mq.removeEventListener) mq.removeEventListener('change', handler)
        else mq.removeListener(handler)
      }
    }
  }, [])

  const s = size
  const half = 50

  return (
    <div role="status" aria-live="polite" style={{ width: s, height: s, display: 'inline-block', position: 'relative' }}>
      <svg viewBox="0 0 100 100" width={s} height={s} aria-hidden={reduced} focusable="false" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="dnaGradA" x1="0" x2="1">
            <stop offset="0%" stopColor="#00d4aa" />
            <stop offset="100%" stopColor="#0077ff" />
          </linearGradient>
          <linearGradient id="dnaGradB" x1="0" x2="1">
            <stop offset="0%" stopColor="#ffd166" />
            <stop offset="100%" stopColor="#ff7ab6" />
          </linearGradient>
          <filter id="planeShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* Background faint ring for depth */}
        <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />

        {/* Helix strands (smooth cubic curves) */}
        <g transform="translate(0,0)" className="helix-group">
          <path d="M14 20 C 32 30, 68 30, 86 20 C 68 40, 32 40, 14 20 Z"
            stroke="url(#dnaGradA)" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.98" />
          <path d="M14 80 C 32 70, 68 70, 86 80 C 68 60, 32 60, 14 80 Z"
            stroke="url(#dnaGradB)" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.98" />

          {/* Smooth rungs — evenly spaced curved lines connecting the strands */}
          {Array.from({ length: 8 }).map((_, i) => {
            const t = 18 + i * 9 // y coordinate mix
            const x1 = 22
            const x2 = 78
            const sway = (i % 2 === 0) ? -6 : 6
            // create a gentle curve via quadratic commands
            return (
              <path key={i}
                d={`M ${x1} ${t} Q 50 ${t + sway} ${x2} ${t}`}
                stroke="rgba(255,255,255,0.85)"
                strokeWidth={1.1}
                fill="none"
                strokeLinecap="round"
                opacity="0.95"
              />
            )
          })}

          {/* small endpoint dots for polish */}
          {Array.from({ length: 9 }).map((_, i) => {
            const t = 14 + i * 8
            return (
              <g key={i}>
                <circle cx={24} cy={t} r={1.6} fill="#fff" opacity={0.95} />
                <circle cx={76} cy={100 - t} r={1.6} fill="#fff" opacity={0.95} />
              </g>
            )
          })}
        </g>

        {/* Orbit path for the airplane — a subtle oval around the helix */}
        <path id="orbitPath" d="M18,50 a32,22 0 1,0 64,0 a32,22 0 1,0 -64,0" fill="none" stroke="none" />

        {/* Plane group that will follow orbitPath */}
        <g id="plane" transform="translate(-8,-8)" filter="url(#planeShadow)">
          <path d="M2 12 L22 2 L18 12 L22 22 Z" fill="#fff" opacity="0.98" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
          <path d="M6 12 L12 10 L18 12" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.6" strokeLinecap="round" />
          {!reduced && (
            <animateMotion
              dur="2.6s"
              repeatCount="indefinite"
              rotate="auto">
              <mpath href="#orbitPath" />
            </animateMotion>
          )}
        </g>

      </svg>

      {/* Visually hidden accessible label */}
      <span style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0,0,0,0)', whiteSpace: 'nowrap', border: 0 }}>
        {title}
      </span>

      <style jsx>{`
        .helix-group {
          transform-origin: 50% 50%;
          animation: helix-spin 5.6s linear infinite;
        }
        @keyframes helix-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .helix-group { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
