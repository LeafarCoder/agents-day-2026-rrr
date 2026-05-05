'use client'

import React, { useEffect, useRef, useState } from 'react'

export default function LottieDnaLoader({ size = 140, autoplay = true }: { size?: number; autoplay?: boolean }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    // If the lottie-player web component is already defined, we're ready
    if (typeof window === 'undefined') return
    const el = (window as any).customElements && (window as any).customElements.get('dotlottie-wc')
    if (el) { setReady(true); return }

    // Dynamically inject the dotLottie web component script from unpkg
    const scriptId = 'dotlottie-wc-script'
    if (document.getElementById(scriptId)) {
      // wait for it to define the custom element
      const check = setInterval(() => {
        if ((window as any).customElements && (window as any).customElements.get('dotlottie-wc')) {
          clearInterval(check)
          setReady(true)
        }
      }, 50)
      return () => clearInterval(check)
    }

    const s = document.createElement('script')
    s.id = scriptId
    s.type = 'module'
    s.src = 'https://unpkg.com/@lottiefiles/dotlottie-wc@0.9.10/dist/dotlottie-wc.js'
    s.async = true
    s.onload = () => {
      // small delay to ensure registration
      setTimeout(() => setReady(true), 50)
    }
    s.onerror = () => {
      // silently fail — caller will fall back to plain spinner
      setReady(false)
    }
    document.head.appendChild(s)

    return () => {
      // keep script for other usages — do not remove to avoid churn
    }
  }, [])

  useEffect(() => {
    // If reduced motion is preferred, we won't autoplay
    if (prefersReduced) return
  }, [prefersReduced])

  return (
    <div ref={containerRef} style={{ width: size, height: size, display: 'inline-block' }} aria-live="polite" role="status" aria-label="Loading profile...">
      {ready ? (
        // @ts-ignore - dotlottie-wc is a web component that handles .lottie archives
        <dotlottie-wc
          src="/dna_spinner.lottie"
          background="transparent"
          speed="1"
          style={{ width: size + 'px', height: size + 'px' }}
          loop={!prefersReduced}
          autoplay={!prefersReduced && autoplay}
        />
      ) : (
        // Fallback: simple text or spinner
        <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width={size * 0.35} height={size * 0.35} viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.08)" strokeWidth="2" />
            <path d="M2 12a10 10 0 0 0 20 0" stroke="#00D4AA" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  )
}
