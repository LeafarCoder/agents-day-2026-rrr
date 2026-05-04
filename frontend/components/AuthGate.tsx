'use client'
import { API_URL } from '@/lib/api'

export default function AuthGate({ page }: { page: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '2rem',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.75rem' }}>
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
            <rect width="56" height="56" rx="16" fill="rgba(0,212,170,0.08)" />
            <path
              d="M20 26v-5a8 8 0 0 1 16 0v5"
              stroke="rgba(0,212,170,0.5)" strokeWidth="2" strokeLinecap="round"
            />
            <rect x="14" y="26" width="28" height="18" rx="4" fill="rgba(0,212,170,0.12)" stroke="rgba(0,212,170,0.4)" strokeWidth="1.5" />
            <circle cx="28" cy="35" r="2.5" fill="rgba(0,212,170,0.6)" />
            <path d="M28 37.5v2.5" stroke="rgba(0,212,170,0.6)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 600,
          color: 'var(--text)', margin: '0 0 0.5rem',
        }}>
          {page} requires sign-in
        </h2>
        <p style={{
          fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6,
          margin: '0 0 2rem',
        }}>
          Connect your Gmail account to unlock your travel data, or explore the app with demo data first.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
          <a
            href={`${API_URL}/auth`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1.5rem', borderRadius: 'var(--radius-md)',
              background: 'var(--text-accent)', color: '#040b18',
              fontSize: '0.9rem', fontWeight: 600, textDecoration: 'none',
              width: '100%', justifyContent: 'center',
            }}
          >
            Sign In with Gmail
          </a>
          <a
            href={`${API_URL}/demo`}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1.5rem', borderRadius: 'var(--radius-md)',
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              fontSize: '0.85rem', fontWeight: 500, textDecoration: 'none',
              width: '100%', justifyContent: 'center',
            }}
          >
            Try Demo
          </a>
        </div>
      </div>
    </div>
  )
}
