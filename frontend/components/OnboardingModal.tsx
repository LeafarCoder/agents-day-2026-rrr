'use client'

import { useState, useRef, useEffect } from 'react'
import { API_URL } from '@/lib/api'
import { COUNTRIES } from '@/lib/countries'

type Step = 'name' | 'location' | 'openrouter'
const STEPS: Step[] = ['name', 'location', 'openrouter']

type Result = {
  hasKey: boolean
  displayName: string | null
  homeCity: string | null
  homeCountry: string | null
  homeCountryCode: string | null
}

type Props = {
  onComplete: (result: Result) => void
}

function flag(code: string) {
  return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}

export default function OnboardingModal({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('')
  const [countryCode, setCountryCode] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [countryOpen, setCountryOpen] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [keySaving, setKeySaving] = useState(false)
  const [keyError, setKeyError] = useState('')
  const [showModels, setShowModels] = useState(false)
  const [showPricingTip, setShowPricingTip] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const stepIdx = STEPS.indexOf(step)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCountryOpen(false)
        setCountrySearch('')
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  )

  function goBack() {
    const prev = STEPS[stepIdx - 1]
    if (prev) setStep(prev)
  }

  async function advanceFromLocation() {
    setProfileSaving(true)
    setProfileError('')
    try {
      const r = await fetch(`${API_URL}/api/settings/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          display_name:      name.trim() || null,
          home_city:         city.trim() || null,
          home_country:      country || null,
          home_country_code: countryCode || null,
        }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setProfileError(d.detail ?? `Error ${r.status}`)
        return
      }
      setStep('openrouter')
    } catch {
      setProfileError('Could not reach the server.')
    } finally {
      setProfileSaving(false)
    }
  }

  async function saveKey() {
    const trimmed = apiKey.trim()
    if (!trimmed) return
    setKeySaving(true)
    setKeyError('')
    try {
      const r = await fetch(`${API_URL}/api/settings/openrouter-key`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: trimmed }),
      })
      if (!r.ok) {
        const text = await r.text()
        let msg = `Server error (${r.status})`
        try { const d = JSON.parse(text); msg = d.detail ?? d.error ?? msg } catch {}
        setKeyError(msg)
        return
      }
      finish(true)
    } catch {
      setKeyError('Could not connect to the API.')
    } finally {
      setKeySaving(false)
    }
  }

  function finish(hasKey: boolean) {
    onComplete({
      hasKey,
      displayName:     name.trim() || null,
      homeCity:        city.trim() || null,
      homeCountry:     country || null,
      homeCountryCode: countryCode || null,
    })
  }

  const STEP_META: Record<Step, { title: string; subtitle: string }> = {
    name:       { title: 'Hey there!',        subtitle: 'What should we call you?' },
    location:   { title: 'Good to meet you.', subtitle: "Where's home for you?" },
    openrouter: { title: 'One last thing.',   subtitle: 'Add your OpenRouter key to enable AI email parsing.' },
  }

  const { title, subtitle } = STEP_META[step]

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
    }}>
      <div className="glass fade-in modal-card" style={{
        borderRadius: 'var(--radius-xl)',
        padding: '2rem',
        width: '100%', maxWidth: 440,
        border: '1px solid var(--border)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.4)',
      }}>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.75rem' }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{
              width: i === stepIdx ? 20 : 7, height: 7,
              borderRadius: 4,
              background: i <= stepIdx ? 'var(--text-accent)' : 'rgba(255,255,255,0.12)',
              transition: 'all 300ms ease',
            }} />
          ))}
        </div>

        {/* Heading — keyed to animate on step change */}
        <div key={step} className="fade-in" style={{ marginBottom: '1.75rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem', fontWeight: 600,
            color: 'var(--text)', margin: '0 0 0.35rem',
          }}>
            {title}
          </h2>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
            {subtitle}
          </p>
        </div>

        {/* Step content */}
        {step === 'name' && (
          <input
            key="name-input"
            autoFocus
            className="input"
            type="text"
            placeholder="Your first name"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') setStep('location') }}
            style={{ width: '100%', fontSize: '1rem', boxSizing: 'border-box', marginBottom: '1.5rem' }}
          />
        )}

        {step === 'location' && (
          <div style={{ marginBottom: profileError ? '0.5rem' : '1.5rem' }}>
            <input
              key="city-input"
              autoFocus
              className="input"
              type="text"
              placeholder="Home city (e.g. Lisbon)"
              value={city}
              onChange={e => setCity(e.target.value)}
              style={{ width: '100%', fontSize: '1rem', boxSizing: 'border-box', marginBottom: '0.75rem' }}
            />
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <div
                onClick={() => { setCountryOpen(o => !o); setCountrySearch('') }}
                style={{
                  padding: '0.6rem 0.9rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  background: 'var(--input-bg, rgba(255,255,255,0.05))',
                  fontSize: '1rem',
                  color: country ? 'var(--text)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  userSelect: 'none',
                }}
              >
                <span>
                  {country
                    ? <>{countryCode && <span style={{ marginRight: '0.5rem' }}>{flag(countryCode)}</span>}{country}</>
                    : 'Select your country'}
                </span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true"
                  style={{ opacity: 0.5, transform: countryOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {countryOpen && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
                  borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
                  background: 'var(--surface-solid)', boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  overflow: 'hidden',
                }}>
                  <div style={{ padding: '0.5rem' }}>
                    <input
                      autoFocus
                      className="input"
                      type="text"
                      placeholder="Search…"
                      value={countrySearch}
                      onChange={e => setCountrySearch(e.target.value)}
                      style={{ fontSize: '0.85rem', padding: '0.4rem 0.7rem' }}
                    />
                  </div>
                  <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {filteredCountries.length === 0 ? (
                      <div style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>No matches</div>
                    ) : filteredCountries.map(c => (
                      <div
                        key={c.code}
                        onClick={() => { setCountry(c.name); setCountryCode(c.code); setCountryOpen(false); setCountrySearch('') }}
                        style={{
                          padding: '0.5rem 1rem', fontSize: '0.88rem', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.5rem',
                          color: c.code === countryCode ? 'var(--text-accent)' : 'var(--text)',
                          background: c.code === countryCode ? 'rgba(0,212,170,0.08)' : 'transparent',
                          transition: 'background 100ms',
                        }}
                        onMouseEnter={e => { if (c.code !== countryCode) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                        onMouseLeave={e => { if (c.code !== countryCode) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{flag(c.code)}</span>
                        {c.name}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {step === 'location' && profileError && (
          <p style={{ fontSize: '0.78rem', color: '#f87171', margin: '0 0 1rem' }}>{profileError}</p>
        )}

        {step === 'openrouter' && (
          <>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.65, margin: '0 0 0.75rem' }}>
              Travel DNA uses <strong style={{ color: 'var(--text)' }}>OpenRouter</strong> to parse your emails with AI. You&apos;ll need your own key — you pay only for what you use, and your emails never leave your device.
            </p>

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
            <div style={{ marginBottom: '1rem' }}>
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

            <div style={{ position: 'relative', marginBottom: keyError ? '0.5rem' : '1rem' }}>
              <input
                autoFocus
                type={showKey ? 'text' : 'password'}
                className="input"
                placeholder="sk-or-v1-…"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveKey() }}
                style={{ width: '100%', paddingRight: '2.5rem', boxSizing: 'border-box' }}
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                tabIndex={-1}
                aria-label={showKey ? 'Hide key' : 'Show key'}
                style={{
                  position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '0.2rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                }}
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
            {keyError && (
              <p style={{ fontSize: '0.78rem', color: '#f87171', margin: '0 0 0.75rem' }}>{keyError}</p>
            )}
          </>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {stepIdx > 0 && step !== 'openrouter' ? (
            <button
              onClick={goBack}
              style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              ← Back
            </button>
          ) : step === 'openrouter' ? (
            <button
              onClick={() => finish(false)}
              style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              I&apos;ll add it later
            </button>
          ) : (
            <span />
          )}

          {step === 'name' && (
            <button className="btn btn-primary" style={{ fontSize: '0.88rem' }} onClick={() => setStep('location')}>
              Next →
            </button>
          )}
          {step === 'location' && (
            <button
              className="btn btn-primary"
              style={{ fontSize: '0.88rem' }}
              disabled={profileSaving}
              onClick={advanceFromLocation}
            >
              {profileSaving ? 'Saving…' : 'Next →'}
            </button>
          )}
          {step === 'openrouter' && (
            <button
              className="btn btn-primary"
              style={{ fontSize: '0.88rem' }}
              disabled={!apiKey.trim() || keySaving}
              onClick={saveKey}
            >
              {keySaving ? 'Verifying…' : 'Save key'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
