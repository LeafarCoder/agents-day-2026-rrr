'use client'

import { useState, useEffect, useLayoutEffect, useRef, useCallback, type CSSProperties } from 'react'
import type { TourStep } from '@/lib/tour'

type Props = {
  steps: TourStep[]
  onFinish: (reason: 'completed' | 'skipped') => void
}

export default function TourOverlay({ steps, onFinish }: Props) {
  const [stepIdx, setStepIdx] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [ready, setReady] = useState(false)
  const [popoverH, setPopoverH] = useState(0)
  const popoverRef = useRef<HTMLDivElement>(null)

  const step = steps[stepIdx]

  const advance = useCallback(() => {
    if (stepIdx >= steps.length - 1) {
      onFinish('completed')
    } else {
      setReady(false)
      setRect(null)
      setStepIdx(i => i + 1)
    }
  }, [stepIdx, steps.length, onFinish])

  const back = useCallback(() => {
    if (stepIdx > 0) {
      setReady(false)
      setRect(null)
      setStepIdx(i => i - 1)
    }
  }, [stepIdx])

  // Find target element, scroll it into view, measure its rect. Retries via RAF for dynamic content.
  useLayoutEffect(() => {
    if (!step) return
    let cancelled = false
    let rafId = 0
    let attempt = 0

    const measure = () => {
      const el = document.querySelector<HTMLElement>(step.target)
      if (!el) {
        if (step.optional && attempt >= 8) {
          advance()
          return
        }
        attempt++
        rafId = requestAnimationFrame(measure)
        return
      }
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      // Wait one frame for scroll to settle before measuring
      rafId = requestAnimationFrame(() => {
        if (cancelled) return
        setRect(el.getBoundingClientRect())
        setReady(true)
      })
    }
    measure()

    const recheck = () => {
      const el = document.querySelector<HTMLElement>(step.target)
      if (el) setRect(el.getBoundingClientRect())
    }

    window.addEventListener('resize', recheck)
    window.addEventListener('scroll', recheck, true)

    let ro: ResizeObserver | null = null
    const targetEl = document.querySelector<HTMLElement>(step.target)
    if (targetEl && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(recheck)
      ro.observe(targetEl)
    }

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', recheck)
      window.removeEventListener('scroll', recheck, true)
      ro?.disconnect()
    }
  }, [stepIdx, step, advance])

  // Measure popover height after it renders so we can position accurately
  useLayoutEffect(() => {
    if (popoverRef.current) {
      setPopoverH(popoverRef.current.getBoundingClientRect().height)
    }
  }, [stepIdx, ready])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFinish('skipped')
      else if (e.key === 'ArrowRight' || e.key === 'Enter') advance()
      else if (e.key === 'ArrowLeft') back()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [advance, back, onFinish])

  if (!step) return null

  const vw = window.innerWidth
  const vh = window.innerHeight
  const popoverW = Math.min(360, vw - 32)
  const effectiveH = popoverH || 180

  let popoverTop = vh / 2 - effectiveH / 2
  let popoverLeft = vw / 2 - popoverW / 2

  if (rect) {
    const centerLeft = Math.max(8, Math.min(rect.left + rect.width / 2 - popoverW / 2, vw - popoverW - 8))
    const gap = 14
    switch (step.placement) {
      case 'bottom':
        popoverTop = rect.bottom + gap
        popoverLeft = centerLeft
        break
      case 'top':
        popoverTop = rect.top - effectiveH - gap
        popoverLeft = centerLeft
        break
      case 'right':
        popoverTop = rect.top + rect.height / 2 - effectiveH / 2
        popoverLeft = rect.right + gap
        break
      case 'left':
        popoverTop = rect.top + rect.height / 2 - effectiveH / 2
        popoverLeft = Math.max(8, rect.left - popoverW - gap)
        break
    }
    // Clamp to viewport
    popoverTop = Math.max(8, Math.min(popoverTop, vh - effectiveH - 8))
    popoverLeft = Math.max(8, Math.min(popoverLeft, vw - popoverW - 8))
  }

  const dimStyle: CSSProperties = {
    position: 'fixed',
    background: 'rgba(0,0,0,0.55)',
    backdropFilter: 'blur(2px)',
    WebkitBackdropFilter: 'blur(2px)',
    transition: 'all 250ms ease',
    zIndex: 105,
  }

  return (
    <>
      {rect ? (
        <>
          <div style={{ ...dimStyle, top: 0, left: 0, right: 0, height: rect.top }} />
          <div style={{ ...dimStyle, top: rect.bottom, left: 0, right: 0, bottom: 0 }} />
          <div style={{ ...dimStyle, top: rect.top, left: 0, width: rect.left, height: rect.height }} />
          <div style={{ ...dimStyle, top: rect.top, left: rect.right, right: 0, height: rect.height }} />
          <div style={{
            position: 'fixed',
            top: rect.top - 3, left: rect.left - 3,
            width: rect.width + 6, height: rect.height + 6,
            borderRadius: 12,
            boxShadow: '0 0 0 3px var(--text-accent), 0 0 32px rgba(0,212,170,0.35)',
            pointerEvents: 'none',
            transition: 'all 250ms ease',
            zIndex: 106,
          }} />
        </>
      ) : (
        <div style={{ ...dimStyle, inset: 0 }} />
      )}

      <div
        ref={popoverRef}
        className="glass fade-in"
        style={{
          position: 'fixed',
          top: popoverTop,
          left: popoverLeft,
          width: `min(360px, calc(100vw - 32px))`,
          borderRadius: 'var(--radius-xl)',
          padding: '1.25rem 1.4rem',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          zIndex: 110,
          opacity: ready ? 1 : 0,
          transition: 'opacity 200ms ease',
        }}
      >
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          Step {stepIdx + 1} of {steps.length}
        </div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 0.5rem' }}>
          {step.title}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.55, margin: '0 0 1rem' }}>
          {step.body}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => onFinish('skipped')}
            style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Skip tour
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {stepIdx > 0 && (
              <button
                className="btn btn-ghost"
                style={{ fontSize: '0.82rem', padding: '0.4rem 0.9rem' }}
                onClick={back}
              >
                Back
              </button>
            )}
            <button
              className="btn btn-primary"
              style={{ fontSize: '0.82rem', padding: '0.4rem 1rem' }}
              onClick={stepIdx === steps.length - 1 ? () => onFinish('completed') : advance}
            >
              {stepIdx === steps.length - 1 ? 'Got it' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
