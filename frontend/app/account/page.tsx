'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { API_URL } from '@/lib/api'

const COUNTRIES: { code: string; name: string }[] = [
  { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' }, { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' }, { code: 'AO', name: 'Angola' }, { code: 'AG', name: 'Antigua and Barbuda' },
  { code: 'AR', name: 'Argentina' }, { code: 'AM', name: 'Armenia' }, { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' }, { code: 'AZ', name: 'Azerbaijan' }, { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' }, { code: 'BD', name: 'Bangladesh' }, { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' }, { code: 'BE', name: 'Belgium' }, { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' }, { code: 'BT', name: 'Bhutan' }, { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia and Herzegovina' }, { code: 'BW', name: 'Botswana' }, { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' }, { code: 'BG', name: 'Bulgaria' }, { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' }, { code: 'CV', name: 'Cabo Verde' }, { code: 'KH', name: 'Cambodia' },
  { code: 'CM', name: 'Cameroon' }, { code: 'CA', name: 'Canada' }, { code: 'CF', name: 'Central African Republic' },
  { code: 'TD', name: 'Chad' }, { code: 'CL', name: 'Chile' }, { code: 'CN', name: 'China' },
  { code: 'CO', name: 'Colombia' }, { code: 'KM', name: 'Comoros' }, { code: 'CG', name: 'Congo' },
  { code: 'CD', name: 'Congo (DRC)' }, { code: 'CR', name: 'Costa Rica' }, { code: 'CI', name: "Côte d'Ivoire" },
  { code: 'HR', name: 'Croatia' }, { code: 'CU', name: 'Cuba' }, { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' }, { code: 'DK', name: 'Denmark' }, { code: 'DJ', name: 'Djibouti' },
  { code: 'DO', name: 'Dominican Republic' }, { code: 'EC', name: 'Ecuador' }, { code: 'EG', name: 'Egypt' },
  { code: 'SV', name: 'El Salvador' }, { code: 'GQ', name: 'Equatorial Guinea' }, { code: 'ER', name: 'Eritrea' },
  { code: 'EE', name: 'Estonia' }, { code: 'SZ', name: 'Eswatini' }, { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' }, { code: 'FI', name: 'Finland' }, { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' }, { code: 'GM', name: 'Gambia' }, { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' }, { code: 'GH', name: 'Ghana' }, { code: 'GR', name: 'Greece' },
  { code: 'GD', name: 'Grenada' }, { code: 'GT', name: 'Guatemala' }, { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' }, { code: 'GY', name: 'Guyana' }, { code: 'HT', name: 'Haiti' },
  { code: 'HN', name: 'Honduras' }, { code: 'HU', name: 'Hungary' }, { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' }, { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' }, { code: 'IE', name: 'Ireland' }, { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' }, { code: 'JM', name: 'Jamaica' }, { code: 'JP', name: 'Japan' },
  { code: 'JO', name: 'Jordan' }, { code: 'KZ', name: 'Kazakhstan' }, { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' }, { code: 'KP', name: 'Korea (North)' }, { code: 'KR', name: 'Korea (South)' },
  { code: 'KW', name: 'Kuwait' }, { code: 'KG', name: 'Kyrgyzstan' }, { code: 'LA', name: 'Laos' },
  { code: 'LV', name: 'Latvia' }, { code: 'LB', name: 'Lebanon' }, { code: 'LS', name: 'Lesotho' },
  { code: 'LR', name: 'Liberia' }, { code: 'LY', name: 'Libya' }, { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lithuania' }, { code: 'LU', name: 'Luxembourg' }, { code: 'MG', name: 'Madagascar' },
  { code: 'MW', name: 'Malawi' }, { code: 'MY', name: 'Malaysia' }, { code: 'MV', name: 'Maldives' },
  { code: 'ML', name: 'Mali' }, { code: 'MT', name: 'Malta' }, { code: 'MH', name: 'Marshall Islands' },
  { code: 'MR', name: 'Mauritania' }, { code: 'MU', name: 'Mauritius' }, { code: 'MX', name: 'Mexico' },
  { code: 'FM', name: 'Micronesia' }, { code: 'MD', name: 'Moldova' }, { code: 'MC', name: 'Monaco' },
  { code: 'MN', name: 'Mongolia' }, { code: 'ME', name: 'Montenegro' }, { code: 'MA', name: 'Morocco' },
  { code: 'MZ', name: 'Mozambique' }, { code: 'MM', name: 'Myanmar' }, { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' }, { code: 'NP', name: 'Nepal' }, { code: 'NL', name: 'Netherlands' },
  { code: 'NZ', name: 'New Zealand' }, { code: 'NI', name: 'Nicaragua' }, { code: 'NE', name: 'Niger' },
  { code: 'NG', name: 'Nigeria' }, { code: 'MK', name: 'North Macedonia' }, { code: 'NO', name: 'Norway' },
  { code: 'OM', name: 'Oman' }, { code: 'PK', name: 'Pakistan' }, { code: 'PW', name: 'Palau' },
  { code: 'PA', name: 'Panama' }, { code: 'PG', name: 'Papua New Guinea' }, { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Peru' }, { code: 'PH', name: 'Philippines' }, { code: 'PL', name: 'Poland' },
  { code: 'PT', name: 'Portugal' }, { code: 'QA', name: 'Qatar' }, { code: 'RO', name: 'Romania' },
  { code: 'RU', name: 'Russia' }, { code: 'RW', name: 'Rwanda' }, { code: 'KN', name: 'Saint Kitts and Nevis' },
  { code: 'LC', name: 'Saint Lucia' }, { code: 'VC', name: 'Saint Vincent and the Grenadines' },
  { code: 'WS', name: 'Samoa' }, { code: 'SM', name: 'San Marino' }, { code: 'ST', name: 'São Tomé and Príncipe' },
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'SN', name: 'Senegal' }, { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' }, { code: 'SL', name: 'Sierra Leone' }, { code: 'SG', name: 'Singapore' },
  { code: 'SK', name: 'Slovakia' }, { code: 'SI', name: 'Slovenia' }, { code: 'SB', name: 'Solomon Islands' },
  { code: 'SO', name: 'Somalia' }, { code: 'ZA', name: 'South Africa' }, { code: 'SS', name: 'South Sudan' },
  { code: 'ES', name: 'Spain' }, { code: 'LK', name: 'Sri Lanka' }, { code: 'SD', name: 'Sudan' },
  { code: 'SR', name: 'Suriname' }, { code: 'SE', name: 'Sweden' }, { code: 'CH', name: 'Switzerland' },
  { code: 'SY', name: 'Syria' }, { code: 'TW', name: 'Taiwan' }, { code: 'TJ', name: 'Tajikistan' },
  { code: 'TZ', name: 'Tanzania' }, { code: 'TH', name: 'Thailand' }, { code: 'TL', name: 'Timor-Leste' },
  { code: 'TG', name: 'Togo' }, { code: 'TO', name: 'Tonga' }, { code: 'TT', name: 'Trinidad and Tobago' },
  { code: 'TN', name: 'Tunisia' }, { code: 'TR', name: 'Turkey' }, { code: 'TM', name: 'Turkmenistan' },
  { code: 'TV', name: 'Tuvalu' }, { code: 'UG', name: 'Uganda' }, { code: 'UA', name: 'Ukraine' },
  { code: 'AE', name: 'United Arab Emirates' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' }, { code: 'UY', name: 'Uruguay' }, { code: 'UZ', name: 'Uzbekistan' },
  { code: 'VU', name: 'Vanuatu' }, { code: 'VE', name: 'Venezuela' }, { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' }, { code: 'ZM', name: 'Zambia' }, { code: 'ZW', name: 'Zimbabwe' },
]

export default function AccountPage() {
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

  // Delete state
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/me`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
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

  function selectCountry(code: string, name: string) {
    setHomeCountry(name)
    setHomeCountryCode(code)
    setCountrySearch('')
    setCountryOpen(false)
  }

  const filteredCountries = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(countrySearch.toLowerCase())
  )

  async function saveProfile() {
    setSaving(true)
    setSaveError(null)
    try {
      const r = await fetch(`${API_URL}/api/settings/profile`, {
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

  async function deleteAllData() {
    if (!confirm('Permanently delete all your data? This cannot be undone.')) return
    setDeleting(true)
    try {
      await fetch(`${API_URL}/api/me`, { method: 'DELETE', credentials: 'include' })
      window.location.href = `${API_URL}/disconnect`
    } catch {
      setDeleting(false)
    }
  }

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
            Name
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

      {/* Activity categories card */}
      <div className="fade-up d-300 glass-subtle" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1rem' }}>
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

      {/* Session card */}
      <div className="fade-up d-400 glass-subtle" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
          Session
        </h2>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', margin: 0 }}>
            {isDemo ? 'You are browsing in demo mode.' : 'Signed in as ' + (userEmail ?? '—')}
          </p>
          <a
            href={`${API_URL}/disconnect`}
            className="btn btn-ghost"
            style={{ fontSize: '0.82rem' }}
          >
            Log out
          </a>
        </div>
      </div>

      {/* Danger zone */}
      {!isDemo && (
        <div className="fade-up d-500" style={{
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
              onClick={deleteAllData}
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
    </div>
  )
}

function flag(code: string) {
  return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}
