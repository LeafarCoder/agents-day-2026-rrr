'use client'
import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import ThemeToggle from './ThemeToggle'
import { API_URL, apiFetch } from '@/lib/api'
import { SESSION_MODE_KEY } from '@/lib/auth'

type Props = {
  displayName: string | null
  isDemo: boolean
}

export default function UserMenu({ displayName, isDemo }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const pathname = usePathname()
  const isOnSettings = pathname === '/account' || pathname === '/categories'

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  useEffect(() => {
    if (!open) return
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  async function logout() {
    try { await apiFetch(`${API_URL}/disconnect`, { method: 'GET' }) } catch {}
    try { localStorage.removeItem('session_token') } catch {}
    try { localStorage.removeItem(SESSION_MODE_KEY) } catch {}
    window.location.href = '/'
  }

  const initial = displayName?.[0]?.toUpperCase() ?? '✦'
  const isActive = isOnSettings || open

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        data-tour="nav-account"
        onClick={() => setOpen(o => !o)}
        aria-label="User menu"
        aria-expanded={open}
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: `1.5px solid ${isActive ? 'var(--text-accent)' : 'var(--border)'}`,
          background: isActive ? 'rgba(0,212,170,0.1)' : 'rgba(255,255,255,0.06)',
          color: isActive ? 'var(--text-accent)' : 'var(--text)',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'border-color 150ms, background 150ms, color 150ms',
          flexShrink: 0,
          letterSpacing: '0.02em',
        }}
        onMouseEnter={e => {
          if (!isActive) {
            e.currentTarget.style.borderColor = 'rgba(0,212,170,0.4)'
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
          }
        }}
        onMouseLeave={e => {
          if (!isActive) {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
          }
        }}
      >
        {initial}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          minWidth: 176,
          background: 'var(--nav-surface)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
          padding: '0.35rem',
          zIndex: 100,
        }}>
          <MenuItem href="/account" label="Account" active={pathname === '/account'} onClick={() => setOpen(false)} />
          <MenuItem href="/categories" label="Categories" active={pathname === '/categories'} onClick={() => setOpen(false)} />
          <Divider />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.3rem 0.6rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Theme</span>
            <ThemeToggle />
          </div>
          {!isDemo && (
            <>
              <Divider />
              <button
                onClick={logout}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '0.35rem 0.6rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  color: '#f87171',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 120ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(248,113,113,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Log out
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--border)', margin: '0.3rem 0' }} />
}

function MenuItem({ href, label, active, onClick }: { href: string; label: string; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <Link
      href={href}
      onClick={onClick}
      style={{
        display: 'block',
        padding: '0.35rem 0.6rem',
        borderRadius: 'var(--radius-sm)',
        fontSize: '0.82rem',
        fontWeight: 500,
        color: active ? 'var(--text-accent)' : (hovered ? 'var(--text)' : 'var(--text-muted)'),
        background: active ? 'rgba(0,212,170,0.07)' : (hovered ? 'rgba(255,255,255,0.05)' : 'transparent'),
        textDecoration: 'none',
        transition: 'background 120ms, color 120ms',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </Link>
  )
}
