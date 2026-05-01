'use client'

/**
 * Single icon button — toggles between dark and light theme.
 * Persists to localStorage and sets data-theme on <html>.
 */
import { useState, useEffect } from 'react'

type Theme = 'dark' | 'light'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as Theme | null) ?? 'dark'
    setTheme(saved)
    setMounted(true)
  }, [])

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    localStorage.setItem('theme', next)
  }

  if (!mounted) return <div style={{ width: 32, height: 32 }} />

  return (
    <button
      onClick={toggle}
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      style={{
        width: 32,
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: '0.95rem',
        transition: 'background 180ms ease, border-color 180ms ease',
        outline: 'none',
        flexShrink: 0,
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-hover)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      onFocus={e => (e.currentTarget.style.boxShadow = '0 0 0 2px var(--border-focus)')}
      onBlur={e  => (e.currentTarget.style.boxShadow = 'none')}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
