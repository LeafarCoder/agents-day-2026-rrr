'use client'

import { useState } from 'react'
import { API_URL } from '@/lib/api'

type Props = {
  onSaved: () => void
  onDismiss: () => void
}

export default function OpenRouterKeyModal({ onSaved, onDismiss }: Props) {
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPricingTip, setShowPricingTip] = useState(false)
  const [showModels, setShowModels] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [showKey, setShowKey] = useState(false)

  async function handleSave() {
    const trimmed = key.trim()
    if (!trimmed) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`${API_URL}/api/settings/openrouter-key`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: trimmed }),
      })
      if (!res.ok) {
        const text = await res.text()
        let msg = `Server error (${res.status})`
        try { const d = JSON.parse(text); msg = d.detail ?? d.error ?? msg } catch {}
        setError(msg)
        return
      }
      onSaved()
    } catch {
      setError('Could not connect to the API. Make sure the server is running.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.55)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div className="glass fade-in" style={{
        borderRadius: 'var(--radius-xl)',
        padding: '2rem',
        width: '100%', maxWidth: 480,
        border: '1px solid var(--border)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.4rem', fontWeight: 600,
            color: 'var(--text)', margin: 0, marginBottom: '0.5rem',
          }}>
            One last step
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.65, margin: 0 }}>
            Travel DNA uses <strong style={{ color: 'var(--text)' }}>OpenRouter</strong> to parse your emails with AI. You'll need your own key — you pay only for what you use, and your emails never leave your device.
          </p>
        </div>

        {/* Collapsible: Models & cost */}
        <div style={{ marginBottom: '0.75rem' }}>
          <button
            onClick={() => setShowModels(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: showModels ? 'rotate(90deg)' : 'none', transition: 'transform 200ms', flexShrink: 0 }}>
              <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Models used
          </button>

          {showModels && (
            <div className="glass-subtle" style={{ borderRadius: 'var(--radius-lg)', padding: '0.85rem 1rem', marginTop: '0.5rem', fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', color: 'var(--text-muted)' }}>
                <div>
                  <span style={{ color: 'var(--text-accent)', fontFamily: 'monospace' }}>minimax/minimax-m1</span>
                  {' — '}booking extraction & preferences
                </div>
                <div>
                  <span style={{ color: 'var(--text-accent)', fontFamily: 'monospace' }}>openai/text-embedding-3-small</span>
                  {' — '}taste-profile embeddings
                </div>
              </div>
              <div style={{ marginTop: '0.6rem', color: 'var(--text-muted)', fontSize: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                Approximately <strong style={{ color: 'var(--text)' }}>$1</strong> per 1,000 emails scanned.
                <span
                  style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}
                  onMouseEnter={() => setShowPricingTip(true)}
                  onMouseLeave={() => setShowPricingTip(false)}
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ cursor: 'default', flexShrink: 0, opacity: 0.55 }}>
                    <circle cx="6.5" cy="6.5" r="6" stroke="currentColor" strokeWidth="1.2"/>
                    <text x="6.5" y="9.5" textAnchor="middle" fontSize="7.5" fill="currentColor" fontFamily="sans-serif">i</text>
                  </svg>
                  {showPricingTip && (
                    <div style={{
                      position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%',
                      transform: 'translateX(-50%)',
                      width: 230, background: 'var(--nav-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.6rem 0.75rem',
                      boxShadow: 'var(--shadow-md)',
                      pointerEvents: 'none', zIndex: 200,
                      fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.6,
                    }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: '0.3rem' }}>Estimate assumptions</div>
                      <div>· ~1,100 words per email (~1,500 input tokens)</div>
                      <div>· ~150 output tokens per response</div>
                      <div>· MiniMax M1: $0.40/M input, $2.20/M output</div>
                      <div>· Embeddings cost is negligible</div>
                    </div>
                  )}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Collapsible: Sign-up instructions */}
        <div style={{ marginBottom: '1.25rem' }}>
          <button
            onClick={() => setShowInstructions(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: showInstructions ? 'rotate(90deg)' : 'none', transition: 'transform 200ms', flexShrink: 0 }}>
              <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            How to get a key
          </button>

          {showInstructions && (
            <ol style={{ fontSize: '0.82rem', color: 'var(--text-muted)', paddingLeft: '1.25rem', margin: '0.5rem 0 0', lineHeight: 1.8 }}>
              <li>
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--text-accent)', textDecoration: 'none' }}
                  onMouseEnter={e => ((e.target as HTMLElement).style.textDecoration = 'underline')}
                  onMouseLeave={e => ((e.target as HTMLElement).style.textDecoration = 'none')}
                >
                  Sign up at openrouter.ai →
                </a>
              </li>
              <li>Add a small credit balance (e.g. $5)</li>
              <li>Create an API key in your account settings</li>
              <li>Paste it below</li>
            </ol>
          )}
        </div>

        {/* Key input */}
        <div style={{ position: 'relative', marginBottom: error ? '0.5rem' : '1rem' }}>
          <input
            type={showKey ? 'text' : 'password'}
            className="input"
            placeholder="sk-or-v1-..."
            value={key}
            onChange={e => setKey(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
            style={{ width: '100%', paddingRight: '2.5rem', boxSizing: 'border-box' }}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowKey(v => !v)}
            style={{
              position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0.2rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
            }}
            tabIndex={-1}
            aria-label={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>
        {error && (
          <p style={{ fontSize: '0.78rem', color: '#f87171', margin: '0 0 0.75rem' }}>{error}</p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem' }}>
          <button
            onClick={onDismiss}
            style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            I&apos;ll add it later
          </button>
          <button
            onClick={handleSave}
            disabled={!key.trim() || saving}
            className="btn btn-primary"
            style={{ fontSize: '0.88rem' }}
          >
            {saving ? 'Verifying…' : 'Save key'}
          </button>
        </div>
      </div>
    </div>
  )
}
