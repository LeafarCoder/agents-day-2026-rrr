'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { API_URL } from '@/lib/api'

type ScanStep = { step: string; msg: string; current?: number; total?: number; cached?: boolean }

const STEP_ORDER = ['auth', 'fetching', 'parsing', 'profiling', 'saving', 'done']

export default function EmailScanPage() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [steps, setSteps] = useState<ScanStep[]>([])
  const [currentStep, setCurrentStep] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [scanError, setScanError] = useState<React.ReactNode>('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [emailsExpanded, setEmailsExpanded] = useState(false)
  const [excludeFilters, setExcludeFilters] = useState({
    promotions: true,
    spam:       true,
    social:     true,
    forums:     true,
  })
  const [customLabels, setCustomLabels] = useState<{ name: string; excluded: boolean }[]>([])
  const [newLabelInput, setNewLabelInput] = useState('')

  useEffect(() => {
    fetch(`${API_URL}/api/me`, { credentials: 'include' })
      .then(r => r.json())
      .then((data) => {
        setConnected(data.connected)
        setIsDemo(data.demo ?? false)
        setFromDate(data.default_from ?? '')
        setToDate(data.default_to ?? '')
      })
      .finally(() => setLoading(false))
  }, [])

  function setDatePreset(months: number) {
    const today = new Date()
    const from  = new Date(today)
    from.setMonth(from.getMonth() - months)
    setFromDate(from.toISOString().split('T')[0])
    setToDate(today.toISOString().split('T')[0])
  }

  function startScan() {
    if (fromDate && toDate && fromDate > toDate) {
      setScanError('"From" date cannot be after "To" date.')
      return
    }
    setScanning(true)
    setSteps([])
    setCurrentStep('')
    setScanError('')
    setEmailsExpanded(false)

    const excludeParams = [
      ...(Object.keys(excludeFilters) as (keyof typeof excludeFilters)[])
        .filter(k => excludeFilters[k])
        .map(k => `exclude=${k}`),
      ...customLabels
        .filter(l => l.excluded)
        .map(l => `exclude=${encodeURIComponent(l.name)}`),
    ].join('&')
    const url = `${API_URL}/scan/stream?from_date=${fromDate}&to_date=${toDate}${excludeParams ? '&' + excludeParams : ''}`
    const es = new EventSource(url, { withCredentials: true })

    es.onmessage = e => {
      const event: ScanStep = JSON.parse(e.data)
      setSteps(prev => [...prev, event])
      setCurrentStep(event.step)
      if (event.step === 'done') {
        es.close()
        setScanning(false)
        setTimeout(() => { window.location.href = `/scan?from=${fromDate}&to=${toDate}` }, 600)
      }
      if (event.step === 'error') {
        es.close()
        setScanning(false)
        if (event.msg === 'openrouter_key_missing') {
          setScanError(
            <>
              No OpenRouter key configured. Go to your{' '}
              <Link
                href="/account"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#f87171', fontWeight: 500, textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
              >
                account
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7M7 1h4m0 0v4m0-4L5.5 6.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              {' '}and add your API key first.
            </>
          )
        } else {
          setScanError(event.msg)
        }
      }
    }
    es.onerror = () => {
      es.close()
      setScanning(false)
      setScanError('Connection lost. Please try again.')
    }
  }

  function addCustomLabel() {
    const trimmed = newLabelInput.trim()
    if (!trimmed || customLabels.some(l => l.name === trimmed)) return
    setCustomLabels(prev => [...prev, { name: trimmed, excluded: true }])
    setNewLabelInput('')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: 'var(--text-accent)', opacity: 0.4,
              animation: `fadeIn 0.6s ease ${i * 0.15}s both`,
            }} />
          ))}
        </div>
      </div>
    )
  }

  if (isDemo) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="glass-subtle" style={{ textAlign: 'center', borderRadius: 'var(--radius-xl)', padding: '2.5rem 2rem', maxWidth: 420 }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🔒</div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>Scanning unavailable in demo mode</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Sign in with your own Gmail account to scan your travel emails.
          </p>
          <a href={`${API_URL}/auth`} className="btn btn-primary" style={{ fontSize: '0.9rem' }}>Sign In</a>
        </div>
      </div>
    )
  }

  if (!connected) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Connect Gmail to scan your emails.</p>
          <a href={`${API_URL}/auth`} className="btn btn-primary">Connect Gmail</a>
        </div>
      </div>
    )
  }

  const parsingEmails = steps.filter(s => s.step === 'parsing')
  const latestParsing = parsingEmails[parsingEmails.length - 1]
  const parsingActive = currentStep === 'parsing'
  const parsingStarted = parsingEmails.length > 0
  const currentN = latestParsing?.current ?? 0
  const totalN = latestParsing?.total ?? 0

  const getSubject = (msg: string) => {
    const m = msg.match(/^Scanning \d+\/\d+: (.+)$/)
    return m ? m[1] : msg
  }

  const collapsedLabel = parsingActive && latestParsing
    ? `Email ${currentN} of ${totalN} — ${getSubject(latestParsing.msg)}`
    : parsingStarted
      ? `Processed ${totalN} emails`
      : 'Processing emails'

  return (
    <div style={{ minHeight: '100vh', padding: '88px 1.5rem 4rem', maxWidth: 680, margin: '0 auto' }}>

      <div className="fade-up" style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
          Scan Emails
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Search your Gmail inbox for travel bookings
        </p>
      </div>

      <div className="fade-up d-100 glass" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: scanning ? 'var(--text-accent)' : 'var(--text-muted)',
            transition: 'background 300ms',
            display: 'inline-block',
            boxShadow: scanning ? 'var(--glow-teal)' : 'none',
            animation: scanning ? 'glowPulse 1.5s ease infinite' : 'none',
          }} />
          <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', margin: 0, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
            {scanning ? 'Scanning...' : 'Scan Emails'}
          </h2>
        </div>

        {!scanning && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {([['1 month', 1], ['3 months', 3], ['1 year', 12], ['5 years', 60], ['10 years', 120]] as [string, number][]).map(([label, months]) => (
                <button key={label} onClick={() => setDatePreset(months)} className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}>
                  {label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 130 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                  className="input"
                />
              </div>
              <div style={{ flex: 1, minWidth: 130 }}>
                <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.35rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={startScan} className="btn btn-primary">
                Scan Emails
              </button>
            </div>

            <button
              onClick={() => setShowAdvanced(v => !v)}
              style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', padding: 0 }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform: showAdvanced ? 'rotate(90deg)' : 'none', transition: 'transform 200ms' }}>
                <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Advanced filters
            </button>

            {showAdvanced && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.06)' }}>

                <div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 0.4rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Gmail Categories</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {([
                      ['promotions', 'Promotions'],
                      ['spam',       'Spam'],
                      ['social',     'Social'],
                      ['forums',     'Forums'],
                    ] as [keyof typeof excludeFilters, string][]).map(([key, label]) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text)' }}>
                        <input
                          type="checkbox"
                          checked={excludeFilters[key]}
                          onChange={e => setExcludeFilters(prev => ({ ...prev, [key]: e.target.checked }))}
                          style={{ accentColor: 'var(--text-accent)', width: 14, height: 14 }}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

                <div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0 0 0.4rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Custom Labels</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {customLabels.map((lbl, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text)' }}>
                          <input
                            type="checkbox"
                            checked={lbl.excluded}
                            onChange={e => setCustomLabels(prev => prev.map((l, idx) => idx === i ? { ...l, excluded: e.target.checked } : l))}
                            style={{ accentColor: 'var(--text-accent)', width: 14, height: 14 }}
                          />
                          {lbl.name}
                        </label>
                        <button
                          onClick={() => setCustomLabels(prev => prev.filter((_, idx) => idx !== i))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem', lineHeight: 1, padding: '0 0.25rem' }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: customLabels.length > 0 ? '0.25rem' : 0 }}>
                      <input
                        type="text"
                        value={newLabelInput}
                        onChange={e => setNewLabelInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addCustomLabel() }}
                        placeholder="Label name…"
                        className="input"
                        style={{ flex: 1, fontSize: '0.8rem' }}
                      />
                      <button onClick={addCustomLabel} className="btn btn-ghost" style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}>
                        Add
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {scanning && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {STEP_ORDER.map(step => {
              if (step === 'parsing') {
                return (
                  <div key="parsing" style={{ opacity: parsingStarted || parsingActive ? 1 : 0.3, transition: 'opacity 300ms' }}>
                    <button
                      onClick={() => parsingStarted && setEmailsExpanded(v => !v)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        background: 'none', border: 'none',
                        cursor: parsingStarted ? 'pointer' : 'default',
                        padding: 0, width: '100%', textAlign: 'left',
                      }}
                    >
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: parsingStarted ? 'var(--text-accent)' : 'var(--text-muted)',
                        boxShadow: parsingActive ? 'var(--glow-teal)' : 'none',
                        animation: parsingActive ? 'glowPulse 1.5s ease infinite' : 'none',
                      }} />
                      <span style={{
                        fontSize: '0.82rem',
                        color: parsingStarted ? 'var(--text)' : 'var(--text-muted)',
                        flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {collapsedLabel}
                      </span>
                      {parsingStarted && (
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                          style={{ transform: emailsExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 200ms', flexShrink: 0, opacity: 0.5 }}
                        >
                          <path d="M3 2l4 3-4 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>

                    {emailsExpanded && parsingEmails.length > 0 && (
                      <div style={{
                        marginTop: '0.5rem', marginLeft: '1.5rem',
                        maxHeight: 180, overflowY: 'auto',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        padding: '0.35rem 0',
                      }}>
                        {parsingEmails.map((email, i) => {
                          const isActive = i === parsingEmails.length - 1 && parsingActive
                          const subject = getSubject(email.msg)
                          const isSkipped = subject === 'skipped' || subject === 'error'
                          const isCached = email.cached === true
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.22rem 0.75rem' }}>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', width: 28, textAlign: 'right', flexShrink: 0 }}>
                                {email.current ?? i + 1}
                              </span>
                              {isActive ? (
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-accent)', animation: 'glowPulse 1.5s ease infinite', flexShrink: 0, display: 'inline-block' }} />
                              ) : isSkipped ? (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.3 }}>
                                  <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                                </svg>
                              ) : isCached ? (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
                                  <path d="M2 3v6l4-3-4-3z" fill="currentColor"/>
                                  <path d="M7 3v6l4-3-4-3z" fill="currentColor"/>
                                </svg>
                              ) : (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0 }}>
                                  <path d="M2 6.5l2.5 2.5 5.5-5.5" stroke="var(--text-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                              <span style={{
                                fontSize: '0.75rem', color: 'var(--text)',
                                flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                opacity: isSkipped ? 0.35 : isCached ? 0.5 : 1,
                              }}>
                                {subject}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              }

              const done = steps.some(s => s.step === step)
              const active = currentStep === step
              const msg = steps.findLast(s => s.step === step)?.msg
              return (
                <div key={step} className={done ? 'fade-in' : ''} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: done || active ? 1 : 0.3, transition: 'opacity 300ms' }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    background: done ? 'var(--text-accent)' : active ? 'var(--text-accent)' : 'var(--text-muted)',
                    boxShadow: active ? 'var(--glow-teal)' : 'none',
                  }} />
                  <span style={{ fontSize: '0.82rem', color: done ? 'var(--text)' : 'var(--text-muted)' }}>
                    {msg ?? step}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {scanError && (
          <p style={{ marginTop: '1rem', fontSize: '0.82rem', color: '#f87171', background: 'rgba(248,113,113,0.08)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
            {scanError}
          </p>
        )}
      </div>
    </div>
  )
}
