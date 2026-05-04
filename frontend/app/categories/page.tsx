'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { API_URL } from '@/lib/api'

export default function CategoriesPage() {
  const [signals, setSignals] = useState<Record<string, string[]>>({})
  const [defaults, setDefaults] = useState<string[]>([])
  const [custom, setCustom] = useState<Record<string, string[]>>({})
  const [isDemo, setIsDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Inline keyword input
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [kwInput, setKwInput] = useState('')

  // New-category inline input
  const [addingCat, setAddingCat] = useState(false)
  const [catInput, setCatInput] = useState('')

  // Custom confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{ msg: string; resolve: (ok: boolean) => void } | null>(null)

  const kwInputRef = useRef<HTMLInputElement>(null)
  const catInputRef = useRef<HTMLInputElement>(null)

  function askConfirm(msg: string): Promise<boolean> {
    return new Promise(resolve => setConfirmDialog({ msg, resolve }))
  }

  function dismissConfirm(ok: boolean) {
    confirmDialog?.resolve(ok)
    setConfirmDialog(null)
  }

  function reload() {
    fetch(`${API_URL}/api/preferences`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setSignals(d.signals ?? {})
        setDefaults(d.defaults ?? [])
        setCustom(d.custom ?? {})
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    fetch(`${API_URL}/api/me`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setIsDemo(d.demo ?? false) })
      .catch(() => {})
    reload()
  }, [])

  useEffect(() => { if (addingTo) kwInputRef.current?.focus() }, [addingTo])
  useEffect(() => { if (addingCat) catInputRef.current?.focus() }, [addingCat])

  async function submitKeyword(category: string) {
    const kw = kwInput.trim().toLowerCase()
    setAddingTo(null)
    setKwInput('')
    if (!kw) return
    setError(null)
    try {
      const form = new FormData()
      form.set('category', category)
      form.set('keyword', kw)
      const r = await fetch(`${API_URL}/api/preferences/keywords`, { method: 'POST', body: form, credentials: 'include' })
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.detail ?? `Error ${r.status}`); return }
      reload()
    } catch {
      setError('Could not reach the server — is the API running?')
    }
  }

  async function deleteKeyword(category: string, keyword: string) {
    const ok = await askConfirm(`Delete keyword "${keyword}" from ${category.replace(/_/g, ' ')}?`)
    if (!ok) return
    setError(null)
    try {
      const r = await fetch(
        `${API_URL}/api/preferences/keywords?category=${encodeURIComponent(category)}&keyword=${encodeURIComponent(keyword)}`,
        { method: 'DELETE', credentials: 'include' },
      )
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.detail ?? `Error ${r.status}`); return }
      reload()
    } catch {
      setError('Could not reach the server — is the API running?')
    }
  }

  async function submitCategory() {
    const name = catInput.trim().toLowerCase().replace(/\s+/g, '_')
    setAddingCat(false)
    setCatInput('')
    if (!name) return
    setError(null)
    try {
      const form = new FormData()
      form.set('name', name)
      const r = await fetch(`${API_URL}/api/preferences/categories`, { method: 'POST', body: form, credentials: 'include' })
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.detail ?? `Error ${r.status}`); return }
      reload()
    } catch {
      setError('Could not reach the server — is the API running?')
    }
  }

  async function deleteCategory(category: string) {
    const ok = await askConfirm(`Delete category "${category.replace(/_/g, ' ')}" and all its custom keywords?`)
    if (!ok) return
    setError(null)
    try {
      const r = await fetch(`${API_URL}/api/preferences/categories/${encodeURIComponent(category)}`, {
        method: 'DELETE', credentials: 'include',
      })
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.detail ?? `Error ${r.status}`); return }
      reload()
    } catch {
      setError('Could not reach the server — is the API running?')
    }
  }

  const categories = Object.keys(signals)

  if (loading) {
    return (
      <div style={{ padding: '88px 1.5rem 4rem', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ height: 32, width: '40%', marginBottom: '2rem' }} className="skeleton" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.875rem', marginTop: '2rem' }}>
          {[...Array(8)].map((_, i) => <div key={i} style={{ height: 120 }} className="skeleton" />)}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Custom confirm dialog */}
      {confirmDialog && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
          onClick={() => dismissConfirm(false)}
        >
          <div
            className="glass fade-up"
            style={{
              padding: '1.75rem',
              borderRadius: 'var(--radius-xl)',
              maxWidth: 380,
              width: 'calc(100% - 3rem)',
              textAlign: 'center',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.55, margin: '0 0 1.5rem' }}>
              {confirmDialog.msg}
            </p>
            <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
              <button
                onClick={() => dismissConfirm(false)}
                className="btn btn-ghost"
                style={{ fontSize: '0.83rem', padding: '0.45rem 1.1rem' }}
              >
                Cancel
              </button>
              <button
                onClick={() => dismissConfirm(true)}
                style={{
                  padding: '0.45rem 1.1rem',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '0.83rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = '#dc2626')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = '#ef4444')}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '88px 1.5rem 4rem', width: 'min(1100px, calc(100vw - 3rem))', margin: '0 auto' }}>

        {/* Header */}
        <div className="fade-up" style={{ marginBottom: '2rem' }}>
          <Link href="/account" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1rem' }}>
            ← Account
          </Link>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 600, color: 'var(--text)', margin: '0 0 0.35rem', lineHeight: 1.15 }}>
                Activity Categories
              </h1>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                {isDemo ? 'Read-only in demo mode. Sign in to manage your own categories.' : 'Keywords used to detect activity types in your travel emails.'}
              </p>
            </div>

            {!isDemo && (
              <div>
                {addingCat ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      ref={catInputRef}
                      value={catInput}
                      onChange={e => setCatInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') submitCategory()
                        if (e.key === 'Escape') { setAddingCat(false); setCatInput('') }
                      }}
                      placeholder="category_name"
                      className="input"
                      style={{ width: 180, fontSize: '0.82rem', padding: '0.4rem 0.75rem' }}
                    />
                    <button onClick={submitCategory} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem' }}>Add</button>
                    <button onClick={() => { setAddingCat(false); setCatInput('') }} className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.4rem 0.7rem' }}>✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingCat(true)}
                    className="btn btn-ghost"
                    style={{ fontSize: '0.82rem', borderColor: 'var(--border-accent)', color: 'var(--text-accent)' }}
                  >
                    + New Category
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="fade-up" style={{ marginBottom: '1rem', padding: '0.65rem 1rem', borderRadius: 'var(--radius-md)', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f87171', fontSize: '0.9rem', padding: '0 0.25rem' }}>✕</button>
          </div>
        )}

        {/* Categories — masonry columns */}
        {categories.length === 0 ? (
          <div className="fade-up d-100 glass-subtle" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No categories yet. Add one to get started.</p>
          </div>
        ) : (
          <div className="visit-grid" style={{ columns: '4 220px', columnGap: '0.875rem' }}>
            {categories.map((category, i) => {
              const isDefault = defaults.includes(category)
              const isAddingHere = addingTo === category
              const customKws: string[] = custom[category] ?? []

              return (
                <div
                  key={category}
                  className={`fade-up d-${Math.min(i + 1, 6) * 100 as 100|200|300|400|500|600} glass-subtle`}
                  style={{
                    breakInside: 'avoid',
                    marginBottom: '0.875rem',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1rem 1.1rem',
                    border: '1px solid var(--border)',
                    transition: 'border-color 200ms',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.6rem',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-accent)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  {/* Card header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize', margin: 0 }}>
                      {category.replace(/_/g, ' ')}
                    </h3>
                    {!isDemo && !isDefault && (
                      <button
                        onClick={() => deleteCategory(category)}
                        title="Delete category"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem 0.3rem',
                          fontSize: '0.75rem', color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)',
                          opacity: 0.6, transition: 'opacity 150ms, color 150ms', lineHeight: 1,
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = '#f87171' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.6'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {signals[category].map(kw => (
                      <KwTag
                        key={kw}
                        keyword={kw}
                        canDelete={!isDemo}
                        onDelete={() => deleteKeyword(category, kw)}
                      />
                    ))}
                  </div>

                  {/* Inline keyword input */}
                  {!isDemo && (
                    <div style={{ marginTop: '0.1rem' }}>
                      {isAddingHere ? (
                        <input
                          ref={kwInputRef}
                          value={kwInput}
                          onChange={e => setKwInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') submitKeyword(category)
                            if (e.key === 'Escape') { setAddingTo(null); setKwInput('') }
                          }}
                          onBlur={() => { if (!kwInput.trim()) { setAddingTo(null); setKwInput('') } }}
                          placeholder="new keyword…"
                          className="input"
                          style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem', borderColor: 'var(--border-accent)' }}
                        />
                      ) : (
                        <button
                          onClick={() => { setAddingTo(category); setKwInput('') }}
                          style={{
                            background: 'none', border: '1px dashed var(--border)', cursor: 'pointer',
                            padding: '0.2rem 0.6rem', borderRadius: '100px', fontSize: '0.7rem',
                            color: 'var(--text-muted)', transition: 'border-color 150ms, color 150ms',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--text-accent)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-accent)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
                        >
                          + add keyword
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

function KwTag({ keyword, canDelete, onDelete }: { keyword: string; canDelete: boolean; onDelete: () => void }) {
  const [hovered, setHovered] = useState(false)

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
        padding: '0.2rem 0.55rem',
        borderRadius: '100px',
        background: 'rgba(0, 212, 170, 0.08)',
        border: '1px solid rgba(0, 212, 170, 0.15)',
        color: 'var(--text-accent)',
        fontSize: '0.7rem',
        letterSpacing: '0.02em',
        transition: 'background 150ms',
      }}
    >
      {keyword}
      {canDelete && hovered && (
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-accent)', fontSize: '0.65rem', padding: 0,
            lineHeight: 1, opacity: 0.7,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.color = '#f87171' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; (e.currentTarget as HTMLElement).style.color = 'var(--text-accent)' }}
        >
          ✕
        </button>
      )}
    </span>
  )
}
