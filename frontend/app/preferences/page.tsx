'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { API_URL } from '@/lib/api'

export default function PreferencesPage() {
  const [signals, setSignals] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [newCategory, setNewCategory] = useState('')
  const [newKeyword, setNewKeyword] = useState({ category: '', keyword: '' })
  const [saving, setSaving] = useState(false)

  function reload() {
    fetch(`${API_URL}/api/preferences`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setSignals(d.signals ?? {}); setLoading(false) })
  }

  useEffect(reload, [])

  async function addCategory(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData()
    form.set('name', newCategory)
    await fetch(`${API_URL}/api/preferences/categories`, { method: 'POST', body: form, credentials: 'include' })
    setNewCategory('')
    setSaving(false)
    reload()
  }

  async function addKeyword(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData()
    form.set('category', newKeyword.category)
    form.set('keyword', newKeyword.keyword)
    await fetch(`${API_URL}/api/preferences/keywords`, { method: 'POST', body: form, credentials: 'include' })
    setNewKeyword(k => ({ ...k, keyword: '' }))
    setSaving(false)
    reload()
  }

  const categories = Object.keys(signals)

  /* ── Loading ──────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div style={{ padding: '88px 1.5rem 4rem', maxWidth: 680, margin: '0 auto' }}>
        <div style={{ height: 32, width: '40%', marginBottom: '2rem' }} className="skeleton" />
        <div style={{ height: 56, marginBottom: '0.75rem' }} className="skeleton" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.75rem', marginTop: '2rem' }}>
          {[...Array(4)].map((_, i) => <div key={i} style={{ height: 100 }} className="skeleton" />)}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '88px 1.5rem 4rem', maxWidth: 680, margin: '0 auto' }}>

      {/* Header */}
      <div className="fade-up" style={{ marginBottom: '2.5rem' }}>
        <Link href="/" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1rem' }}>
          ← Profile
        </Link>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.5rem)', fontWeight: 600, color: 'var(--text)', margin: '0 0 0.5rem', lineHeight: 1.15 }}>
          Activity Categories
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
          Keywords used to detect activity types in email subjects and bodies.
        </p>
      </div>

      {/* Add category */}
      <div className="fade-up d-100 glass" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Add Category
        </h2>
        <form onSubmit={addCategory} style={{ display: 'flex', gap: '0.75rem' }}>
          <input
            value={newCategory}
            onChange={e => setNewCategory(e.target.value)}
            placeholder="e.g. outdoor_adventure"
            required
            className="input"
            style={{ flex: 1 }}
          />
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ flexShrink: 0 }}>
            Add
          </button>
        </form>
      </div>

      {/* Add keyword */}
      <div className="fade-up d-200 glass" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Add Keyword
        </h2>
        <form onSubmit={addKeyword} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={newKeyword.category}
            onChange={e => setNewKeyword(k => ({ ...k, category: e.target.value }))}
            required
            className="input"
            style={{ flex: '0 0 auto', minWidth: 180, color: newKeyword.category ? 'var(--text)' : 'var(--text-muted)', background: 'rgba(8,15,26,0.6)', cursor: 'pointer' }}
          >
            <option value="">Select category</option>
            {categories.map(c => (
              <option key={c} value={c} style={{ background: '#0f1b2d' }}>
                {c.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
          <input
            value={newKeyword.keyword}
            onChange={e => setNewKeyword(k => ({ ...k, keyword: e.target.value }))}
            placeholder="e.g. hiking"
            required
            className="input"
            style={{ flex: 1, minWidth: 140 }}
          />
          <button type="submit" className="btn btn-ghost" disabled={saving} style={{ flexShrink: 0, borderColor: 'var(--border-accent)', color: 'var(--text-accent)' }}>
            Add Keyword
          </button>
        </form>
      </div>

      {/* Categories grid */}
      {categories.length === 0 ? (
        <div className="fade-up d-300 glass-subtle" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No categories yet. Add one above to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.875rem' }}>
          {categories.map((category, i) => (
            <div
              key={category}
              className={`fade-up d-${Math.min(i + 1, 6) * 100 as 100|200|300|400|500|600} glass-subtle`}
              style={{ borderRadius: 'var(--radius-lg)', padding: '1.1rem 1.25rem', transition: 'border-color 200ms', border: '1px solid var(--border)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <h3 style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem', textTransform: 'capitalize' }}>
                {category.replace(/_/g, ' ')}
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {signals[category].map(kw => (
                  <span key={kw} style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '100px',
                    background: 'rgba(0, 212, 170, 0.08)',
                    border: '1px solid rgba(0, 212, 170, 0.15)',
                    color: 'var(--text-accent)',
                    fontSize: '0.72rem',
                    letterSpacing: '0.02em',
                  }}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
