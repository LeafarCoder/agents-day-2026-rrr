'use client'

import React from 'react'
import Link from 'next/link'
import DNASpinner from '@/components/DNASpinner'

export default function SpinnerPreviewPage() {
  return (
    <div style={{ minHeight: '100vh', padding: '88px 1.5rem 4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', marginBottom: '0.75rem' }}>Loader preview</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>This page previews the DNA helix + airplane loader. It respects prefers-reduced-motion.</p>
        <div style={{ margin: '0 auto', width: 140 }}>
          <DNASpinner size={140} title="Loading preview…" />
        </div>

        <div style={{ marginTop: '1.25rem' }}>
          <Link href="/" style={{ color: 'var(--text-accent)', textDecoration: 'none' }}>Back to app</Link>
        </div>
      </div>
    </div>
  )
}
