'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { API_URL, apiFetch } from '@/lib/api'
import { SESSION_MODE_KEY } from '@/lib/auth'
import { postTourReset, setTourSeenCached } from '@/lib/tour'
import { COUNTRIES } from '@/lib/countries'
import { useIsMobile } from '@/lib/useIsMobile'
import AuthGate from '@/components/AuthGate'

export default function AccountPage() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [loading, setLoading] = useState(true)

  // Editable fields
  const [displayName, setDisplayName] = useState('')
  const [homeCity, setHomeCity] = useState('')
  const [homeCountry, setHomeCountry] = useState('')
  const [homeCountryCode, setHomeCountryCode] = useState('')

  // Country dropdown
  const [countrySearch, setCountrySearch] = useState('')
  const [countryOpen, setCountryOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Save state
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // OpenRouter key state
  const [hasKey, setHasKey] = useState(false)
  const [keyInput, setKeyInput] = useState('')
  const [keySaving, setKeySaving] = useState(false)
  const [keySaved, setKeySaved] = useState(false)
  const [keyError, setKeyError] = useState<string | null>(null)
  const [keyRemoving, setKeyRemoving] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [keyRevealing, setKeyRevealing] = useState(false)

  // Excluded Gmail labels state
  const STANDARD_LABELS = ['promotions', 'spam', 'social', 'forums'] as const
  const [excludeFilters, setExcludeFilters] = useState<Record<string, boolean>>({
    promotions: true, spam: true, social: true, forums: true,
  })
  const [customLabels, setCustomLabels] = useState<string[]>([])
  const [newLabelInput, setNewLabelInput] = useState('')
  const [labelsSaving, setLabelsSaving] = useState(false)
  const [labelsSaved, setLabelsSaved] = useState(false)
  const [labelsError, setLabelsError] = useState<string | null>(null)
  // Saved baseline — used to compute dirty state
  const [savedExcludeFilters, setSavedExcludeFilters] = useState<Record<string, boolean>>({
    promotions: true, spam: true, social: true, forums: true,
  })
  const [savedCustomLabels, setSavedCustomLabels] = useState<string[]>([])

  // Delete state
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    apiFetch(`${API_URL}/api/me`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setConnected(d.connected ?? false)
        setUserEmail(d.user_email ?? null)
        setIsDemo(d.demo ?? false)
        setDisplayName(d.display_name ?? '')
        setHomeCity(d.home_city ?? '')
        setHomeCountry(d.home_country ?? '')
        setHomeCountryCode(d.home_country_code ?? '')
        if (d.home_country && !d.home_country_code) {
          const match = COUNTRIES.find(c => c.name === d.home_country)
          if (match) setHomeCountryCode(match.code)
        }
        setHasKey(d.has_openrouter_key ?? false)

        const stored: string[] = d.excluded_gmail_labels ?? ['promotions', 'spam', 'social', 'forums']
        const standard = new Set(['promotions', 'spam', 'social', 'forums'])
        const loadedFilters = {
          promotions: stored.includes('promotions'),
          spam:       stored.includes('spam'),
          social:     stored.includes('social'),
          forums:     stored.includes('forums'),
        }
        const loadedCustom = stored.filter(l => !standard.has(l))
        setExcludeFilters(loadedFilters)
        setSavedExcludeFilters(loadedFilters)
        setCustomLabels(loadedCustom)
        setSavedCustomLabels(loadedCustom)

        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  // Close dropdown on outside click
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

  const isMobile = useIsMobile()

  function selectCountry(code: string, name: string) {
    setHomeCountry(name)
    setHomeCountryCode(code)
    setCountrySearch('')
    setCountryOpen(false)
  }

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  )

  async function saveExcludedLabels() {
    setLabelsSaving(true)
    setLabelsError(null)
    const labels = [
      ...STANDARD_LABELS.filter(l => excludeFilters[l]),
      ...customLabels,
    ]
    try {
      const r = await apiFetch(`${API_URL}/api/settings/excluded-labels`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ labels }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setLabelsError(d.detail ?? `Error ${r.status}`)
      } else {
        setLabelsSaved(true)
        setSavedExcludeFilters({ ...excludeFilters })
        setSavedCustomLabels([...customLabels])
        setTimeout(() => setLabelsSaved(false), 2500)
      }
    } catch {
      setLabelsError('Could not reach the server.')
    } finally {
      setLabelsSaving(false)
    }
  }

  async function saveProfile() {
    setSaving(true)
    setSaveError(null)
    try {
      const r = await apiFetch(`${API_URL}/api/settings/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          display_name:      displayName.trim() || null,
          home_city:         homeCity.trim() || null,
          home_country:      homeCountry || null,
          home_country_code: homeCountryCode || null,
        }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        setSaveError(d.detail ?? `Error ${r.status}`)
      } else {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      }
    } catch {
      setSaveError('Could not reach the server.')
    } finally {
      setSaving(false)
    }
  }

  async function saveKey() {
    const trimmed = keyInput.trim()
    if (!trimmed) return
    setKeySaving(true)
    setKeyError(null)
    try {
      const r = await apiFetch(`${API_URL}/api/settings/openrouter-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ key: trimmed }),
      })
      if (!r.ok) {
        const text = await r.text()
        let msg = `Server error (${r.status})`
        try { const d = JSON.parse(text); msg = d.detail ?? d.error ?? msg } catch {}
        setKeyError(msg)
      } else {
        setHasKey(true)
        setKeyInput('')
        setRevealedKey(null)
        setKeySaved(true)
        setTimeout(() => setKeySaved(false), 2500)
      }
    } catch {
      setKeyError('Could not reach the server.')
    } finally {
      setKeySaving(false)
    }
  }

  async function removeKey() {
    setKeyRemoving(true)
    setKeyError(null)
    try {
      const r = await apiFetch(`${API_URL}/api/settings/openrouter-key`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!r.ok) {
        const text = await r.text()
        let msg = `Server error (${r.status})`
        try { const d = JSON.parse(text); msg = d.detail ?? d.error ?? msg } catch {}
        setKeyError(msg)
      } else {
        setHasKey(false)
        setKeyInput('')
        setRevealedKey(null)
      }
    } catch {
      setKeyError('Could not reach the server.')
    } finally {
      setKeyRemoving(false)
    }
  }

  async function toggleRevealKey() {
    if (revealedKey) { setRevealedKey(null); return }
    setKeyRevealing(true)
    try {
      const r = await apiFetch(`${API_URL}/api/settings/openrouter-key`, { credentials: 'include' })
      if (r.ok) {
        const d = await r.json()
        setRevealedKey(d.key)
      }
    } finally {
      setKeyRevealing(false)
    }
  }

  async function deleteAllData() {
    setDeleting(true)
    setShowDeleteConfirm(false)
    try {
      await apiFetch(`${API_URL}/api/me`, { method: 'DELETE', credentials: 'include' })
      window.location.href = `${API_URL}/disconnect`
    } catch {
      setDeleting(false)
    }
  }

  if (connected === false) return <AuthGate page="Account" />

  if (loading) {
    return (
      <div style={{ padding: '88px 1.5rem 4rem', maxWidth: 560, margin: '0 auto' }}>
        <div style={{ height: 28, width: '30%', marginBottom: '2rem' }} className="skeleton" />
        {[140, 100, 120].map((h, i) => (
          <div key={i} style={{ height: h, marginBottom: '1rem', borderRadius: 'var(--radius-lg)' }} className="skeleton" />
        ))}
      </div>
    )
  }

  const isReadOnly = isDemo

  const labelsModified =
    STANDARD_LABELS.some(k => excludeFilters[k] !== savedExcludeFilters[k]) ||
    [...customLabels].sort().join('\0') !== [...savedCustomLabels].sort().join('\0')

  return (
    <div style={{ padding: '88px 1.5rem 4rem', maxWidth: 560, margin: '0 auto' }}>

      {/* Back link */}
      <div className="fade-up" style={{ marginBottom: '1.5rem' }}>
        <Link href="/" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
          ← Profile
        </Link>
      </div>

      <div className="fade-up d-100" style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.6rem, 4vw, 2rem)', fontWeight: 600, color: 'var(--text)', margin: '0 0 0.25rem' }}>
          Account
        </h1>
        {isDemo && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            Read-only in demo mode. Sign in to manage your account.
          </p>
        )}
      </div>

      {/* Profile info card */}
      <div className="fade-up d-200 glass-subtle" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 1.25rem' }}>
          Profile
        </h2>

        {/* Email — read only */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Email
          </label>
          <div style={{
            padding: '0.55rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--border)',
            fontSize: '0.85rem',
            color: 'var(--text-muted)',
          }}>
            {userEmail ?? '—'}
          </div>
        </div>

        {/* Display name */}
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="display-name" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            First name
          </label>
          <input
            id="display-name"
            className="input"
            type="text"
            placeholder="Your first name"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            disabled={isReadOnly}
            style={{ fontSize: '0.85rem' }}
          />
        </div>

        {/* Home city */}
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="home-city" style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Home city
          </label>
          <input
            id="home-city"
            className="input"
            type="text"
            placeholder="e.g. Lisbon"
            value={homeCity}
            onChange={e => setHomeCity(e.target.value)}
            disabled={isReadOnly}
            style={{ fontSize: '0.85rem' }}
          />
        </div>

        {/* Home country — searchable dropdown */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
            Home country
          </label>
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <div
              onClick={() => { if (!isReadOnly) { setCountryOpen(o => !o); setCountrySearch('') } }}
              style={{
                padding: '0.55rem 0.85rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                background: 'var(--input-bg, rgba(255,255,255,0.05))',
                fontSize: '0.85rem',
                color: homeCountry ? 'var(--text)' : 'var(--text-muted)',
                cursor: isReadOnly ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                userSelect: 'none',
              }}
            >
              <span>
                {homeCountry
                  ? <>{homeCountryCode && <span style={{ marginRight: '0.45rem' }}>{flag(homeCountryCode)}</span>}{homeCountry}</>
                  : 'Select country'}
              </span>
              {!isReadOnly && (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ opacity: 0.5, transform: countryOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>

            {countryOpen && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 4px)',
                left: 0, right: 0,
                zIndex: 50,
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border)',
                background: 'var(--surface-solid)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                overflow: 'hidden',
              }}>
                <div style={{ padding: '0.5rem' }}>
                  <input
                    autoFocus
                    className="input"
                    type="text"
                    placeholder="Search countries…"
                    value={countrySearch}
                    onChange={e => setCountrySearch(e.target.value)}
                    style={{ fontSize: '0.82rem', padding: '0.4rem 0.7rem' }}
                  />
                </div>
                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                  {filteredCountries.length === 0 ? (
                    <div style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>No matches</div>
                  ) : filteredCountries.map(c => (
                    <div
                      key={c.code}
                      onClick={() => selectCountry(c.code, c.name)}
                      style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.83rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: c.code === homeCountryCode ? 'var(--text-accent)' : 'var(--text)',
                        background: c.code === homeCountryCode ? 'rgba(0,212,170,0.08)' : 'transparent',
                        transition: 'background 100ms',
                      }}
                      onMouseEnter={e => { if (c.code !== homeCountryCode) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)' }}
                      onMouseLeave={e => { if (c.code !== homeCountryCode) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <span style={{ fontSize: '1rem', lineHeight: 1 }}>{flag(c.code)}</span>
                      {c.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save button */}
        {!isReadOnly && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={saveProfile}
              disabled={saving}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            {saved && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-accent)' }}>Saved ✓</span>
            )}
            {saveError && (
              <span style={{ fontSize: '0.8rem', color: '#f87171' }}>{saveError}</span>
            )}
          </div>
        )}
      </div>

      {/* OpenRouter API key card */}
      {!isDemo && (
        <div className="fade-up d-300 glass-subtle" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 0.6rem' }}>
            OpenRouter API Key
          </h2>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: '0 0 1rem', lineHeight: 1.55 }}>
            Used to parse your travel emails with AI. You pay only for what you use —&nbsp;
            <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-accent)', textDecoration: 'none' }}
              onMouseEnter={e => ((e.target as HTMLElement).style.textDecoration = 'underline')}
              onMouseLeave={e => ((e.target as HTMLElement).style.textDecoration = 'none')}>
              get a key at openrouter.ai →
            </a>
          </p>

          {hasKey && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                fontSize: '0.82rem', color: 'var(--text-accent)',
              }}>
                <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: 'var(--text-accent)', flexShrink: 0 }} />
                API key configured
                <button
                  type="button"
                  onClick={toggleRevealKey}
                  disabled={keyRevealing}
                  aria-label={revealedKey ? 'Hide key' : 'Reveal key'}
                  title={revealedKey ? 'Hide key' : 'Reveal key'}
                  style={{
                    background: 'none', border: 'none', cursor: keyRevealing ? 'default' : 'pointer',
                    padding: '0.15rem', color: 'var(--text-accent)', display: 'flex', alignItems: 'center',
                    opacity: keyRevealing ? 0.5 : 1,
                  }}
                >
                  {revealedKey ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
              {revealedKey && (
                <div style={{
                  marginTop: '0.45rem',
                  padding: '0.45rem 0.75rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(0,0,0,0.04)',
                  border: '1px solid var(--border)',
                  fontFamily: 'monospace',
                  fontSize: '0.78rem',
                  color: 'var(--text)',
                  wordBreak: 'break-all',
                }}>
                  {revealedKey}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 0, width: isMobile ? '100%' : undefined }}>
              <input
                type={showKey ? 'text' : 'password'}
                className="input"
                placeholder={hasKey ? 'sk-or-v1-… (replace current key)' : 'sk-or-v1-…'}
                value={keyInput}
                onChange={e => setKeyInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveKey() }}
                style={{ fontSize: '0.85rem', width: '100%', paddingRight: '2.5rem', boxSizing: 'border-box' }}
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
            <button
              onClick={saveKey}
              disabled={!keyInput.trim() || keySaving}
              className="btn btn-primary"
              style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', flexShrink: 0, width: isMobile ? '100%' : undefined }}
            >
              {keySaving ? 'Verifying…' : hasKey ? 'Update key' : 'Save key'}
            </button>
            {hasKey && (
              <button
                onClick={removeKey}
                disabled={keyRemoving}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(248,113,113,0.4)',
                  background: 'transparent',
                  color: '#f87171',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  cursor: keyRemoving ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  opacity: keyRemoving ? 0.6 : 1,
                  width: isMobile ? '100%' : undefined,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                {keyRemoving ? 'Removing…' : 'Remove'}
              </button>
            )}
          </div>

          {keySaved && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-accent)', margin: '0.5rem 0 0' }}>Key saved ✓</p>
          )}
          {keyError && (
            <p style={{ fontSize: '0.8rem', color: '#f87171', margin: '0.5rem 0 0' }}>{keyError}</p>
          )}
        </div>
      )}

      {/* Product tour */}
      {!isDemo && (
        <div className="fade-up d-350 glass-subtle" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 0.6rem' }}>
            Product tour
          </h2>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: '0 0 1rem', lineHeight: 1.55 }}>
            Walk through the dashboard highlights again.
          </p>
          <button
            className="btn btn-ghost"
            style={{ fontSize: '0.82rem' }}
            onClick={async () => {
              await postTourReset()
              setTourSeenCached(false)
              window.location.href = '/'
            }}
          >
            Replay tour →
          </button>
        </div>
      )}

      {/* Activity categories card */}
      <div className="fade-up d-400 glass-subtle" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 0.6rem' }}>
          Activity Categories
        </h2>
        <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: '0 0 1rem', lineHeight: 1.55 }}>
          Keywords used to detect activity types in your travel emails. Customise which categories and terms are matched during a scan.
        </p>
        <Link
          href="/categories"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            fontSize: '0.82rem', fontWeight: 500,
            color: 'var(--text-accent)', textDecoration: 'none',
            padding: '0.4rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-accent)',
            transition: 'background 150ms',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(0,212,170,0.08)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          Manage categories →
        </Link>
      </div>

      {/* Excluded Gmail Labels */}
      {!isDemo && (
        <div className="fade-up d-450 glass-subtle" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 0.4rem' }}>
            Excluded Gmail Labels
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
            Emails in these labels are skipped during scanning.
          </p>

          {/* Standard checkboxes — horizontal wrap */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {(['promotions', 'spam', 'social', 'forums'] as const).map(key => (
              <label
                key={key}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.3rem 0.7rem',
                  borderRadius: 'var(--radius-md)',
                  border: `1px solid ${excludeFilters[key] ? 'rgba(0,212,170,0.35)' : 'var(--border)'}`,
                  background: excludeFilters[key] ? 'rgba(0,212,170,0.07)' : 'transparent',
                  cursor: 'pointer', fontSize: '0.82rem',
                  color: excludeFilters[key] ? 'var(--text)' : 'var(--text-muted)',
                  transition: 'border-color 150ms, background 150ms',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  className="trip-checkbox"
                  checked={!!excludeFilters[key]}
                  onChange={e => setExcludeFilters(f => ({ ...f, [key]: e.target.checked }))}
                />
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </label>
            ))}
          </div>

          {/* Custom label tags — horizontal wrap */}
          {customLabels.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
              {customLabels.map((lbl, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0.25rem 0.5rem 0.25rem 0.65rem',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border)',
                    fontSize: '0.78rem', color: 'var(--text)',
                  }}
                >
                  {lbl}
                  <button
                    onClick={() => setCustomLabels(prev => prev.filter((_, idx) => idx !== i))}
                    aria-label={`Remove ${lbl}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 16, height: 16, padding: 0,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--text-muted)', borderRadius: '50%',
                      lineHeight: 1, fontSize: '0.75rem',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#f87171' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add custom label */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <input
              className="input"
              type="text"
              placeholder="Gmail label name…"
              value={newLabelInput}
              onChange={e => setNewLabelInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const t = newLabelInput.trim()
                  if (t && !customLabels.includes(t) && !STANDARD_LABELS.includes(t as typeof STANDARD_LABELS[number])) {
                    setCustomLabels(prev => [...prev, t])
                    setNewLabelInput('')
                  }
                }
              }}
              style={{ flex: 1, fontSize: '0.83rem' }}
            />
            <button
              className="btn btn-ghost"
              style={{ fontSize: '0.82rem', whiteSpace: 'nowrap' }}
              onClick={() => {
                const t = newLabelInput.trim()
                if (t && !customLabels.includes(t) && !STANDARD_LABELS.includes(t as typeof STANDARD_LABELS[number])) {
                  setCustomLabels(prev => [...prev, t])
                  setNewLabelInput('')
                }
              }}
            >
              Add
            </button>
          </div>

          {labelsModified && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ color: '#f59e0b' }}>⚠</span> Click Save to apply your changes.
            </p>
          )}
          <button
            className="btn btn-primary"
            style={{ fontSize: '0.82rem' }}
            onClick={saveExcludedLabels}
            disabled={labelsSaving}
          >
            {labelsSaving ? 'Saving…' : 'Save'}
          </button>
          {labelsSaved && <span style={{ marginLeft: '0.75rem', fontSize: '0.8rem', color: 'var(--text-accent)' }}>Saved ✓</span>}
          {labelsError && <p style={{ fontSize: '0.8rem', color: '#f87171', margin: '0.5rem 0 0' }}>{labelsError}</p>}
        </div>
      )}

      {/* Session card */}
      <div className="fade-up d-500 glass-subtle" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
          Session
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0 }}>
            {isDemo ? 'You are browsing in demo mode.' : 'Signed in as ' + (userEmail ?? '—')}
          </p>
          <button
            onClick={async () => {
              try {
                await apiFetch(`${API_URL}/disconnect`, { method: 'GET' })
              } catch (e) {
                // ignore
              }
              try { localStorage.removeItem('session_token') } catch {}
              try { localStorage.removeItem(SESSION_MODE_KEY) } catch {}
              window.location.href = '/'
            }}
            className="btn btn-ghost"
            style={{ fontSize: '0.82rem' }}
          >
            Log out
          </button>
        </div>
      </div>

      {/* Danger zone */}
      {!isDemo && (
        <div className="fade-up d-600" style={{
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem',
          marginBottom: '1rem',
          border: '1px solid rgba(248,113,113,0.25)',
          background: 'rgba(248,113,113,0.04)',
        }}>
          <h2 style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#f87171', margin: '0 0 0.75rem' }}>
            Danger zone
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <p style={{ fontSize: '0.83rem', color: 'var(--text)', margin: '0 0 0.2rem', fontWeight: 500 }}>Delete all data</p>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Removes all scanned emails, trips, and preferences. Cannot be undone.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(248,113,113,0.4)',
                background: 'transparent',
                color: '#f87171',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: deleting ? 'not-allowed' : 'pointer',
                transition: 'background 150ms',
                whiteSpace: 'nowrap',
                opacity: deleting ? 0.6 : 1,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.1)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              {deleting ? 'Deleting…' : 'Delete all data'}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          onClick={() => setShowDeleteConfirm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="glass fade-in modal-card"
            style={{
              borderRadius: 'var(--radius-xl)',
              padding: '1.75rem',
              width: '100%', maxWidth: 400,
              border: '1px solid rgba(248,113,113,0.3)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
              display: 'flex', flexDirection: 'column', gap: '1.25rem',
            }}
          >
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 0.5rem' }}>
                Delete all data?
              </h2>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.55 }}>
                This will permanently remove all your scanned emails, trips, and preferences. This action cannot be undone.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-ghost"
                style={{ fontSize: '0.82rem' }}
              >
                Cancel
              </button>
              <button
                onClick={deleteAllData}
                style={{
                  padding: '0.45rem 1rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(248,113,113,0.5)',
                  background: 'rgba(248,113,113,0.12)',
                  color: '#f87171',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 150ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.22)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.12)' }}
              >
                Yes, delete everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function flag(code: string) {
  return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}
