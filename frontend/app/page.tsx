'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { API_URL } from '@/lib/api'

const WorldMap = dynamic(() => import('./components/WorldMap'), { ssr: false })

type KeywordPref = { keyword: string; count: number }
type Preference = { total: number; keywords: KeywordPref[] }
type CityVisit = { name: string; visits: string[] }
type CountryVisit = { name: string; code: string; cities: CityVisit[] }
type TripExperience = { category: string; examples: string[] }
type TripData = { city: string; label: string | null; experiences: TripExperience[] }

const CATEGORY_LABEL: Record<string, string> = {
  food_dining: 'Food & Dining', culture_history: 'Culture', adventure_outdoor: 'Outdoor',
  nightlife: 'Nightlife', wellness: 'Wellness', sightseeing: 'Sightseeing',
  accommodation: 'Accommodation', transportation: 'Transportation', cuisine: 'Cuisine',
}
type Profile = {
  email_count?: number
  preferences?: Record<string, Preference>
  countries_visited?: CountryVisit[]
}
type MeResponse = {
  connected: boolean
  user_email: string | null
  profile: Profile | null
}

function flagEmoji(code: string) {
  return [...code.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('')
}

type VisitGroupMode = 'country' | 'year' | 'continent' | 'season'
type VisitItem = { countryCode: string; countryName: string; cityName: string; visit: string }

const CONTINENT_MAP: Record<string, string> = {
  GB:'Europe',FR:'Europe',DE:'Europe',IT:'Europe',ES:'Europe',PT:'Europe',NL:'Europe',
  BE:'Europe',CH:'Europe',AT:'Europe',SE:'Europe',NO:'Europe',DK:'Europe',FI:'Europe',
  PL:'Europe',CZ:'Europe',HU:'Europe',RO:'Europe',GR:'Europe',HR:'Europe',SI:'Europe',
  SK:'Europe',BG:'Europe',RS:'Europe',ME:'Europe',BA:'Europe',MK:'Europe',AL:'Europe',
  UA:'Europe',BY:'Europe',LT:'Europe',LV:'Europe',EE:'Europe',IS:'Europe',IE:'Europe',
  LU:'Europe',MT:'Europe',CY:'Europe',TR:'Europe',MD:'Europe',GE:'Europe',AM:'Europe',AZ:'Europe',MC:'Europe',SM:'Europe',LI:'Europe',AD:'Europe',
  JP:'Asia',CN:'Asia',KR:'Asia',TH:'Asia',VN:'Asia',ID:'Asia',MY:'Asia',SG:'Asia',
  PH:'Asia',IN:'Asia',NP:'Asia',LK:'Asia',MV:'Asia',MM:'Asia',KH:'Asia',LA:'Asia',
  BN:'Asia',TW:'Asia',HK:'Asia',MO:'Asia',BD:'Asia',PK:'Asia',AF:'Asia',IR:'Asia',
  IQ:'Asia',SA:'Asia',AE:'Asia',QA:'Asia',KW:'Asia',BH:'Asia',OM:'Asia',YE:'Asia',
  JO:'Asia',LB:'Asia',SY:'Asia',IL:'Asia',KZ:'Asia',UZ:'Asia',TM:'Asia',KG:'Asia',TJ:'Asia',MN:'Asia',
  US:'Americas',CA:'Americas',MX:'Americas',BR:'Americas',AR:'Americas',CO:'Americas',
  CL:'Americas',PE:'Americas',VE:'Americas',EC:'Americas',BO:'Americas',PY:'Americas',
  UY:'Americas',GY:'Americas',SR:'Americas',PA:'Americas',CR:'Americas',NI:'Americas',
  HN:'Americas',GT:'Americas',SV:'Americas',BZ:'Americas',CU:'Americas',JM:'Americas',
  HT:'Americas',DO:'Americas',PR:'Americas',TT:'Americas',BB:'Americas',
  ZA:'Africa',EG:'Africa',MA:'Africa',TN:'Africa',DZ:'Africa',LY:'Africa',NG:'Africa',
  GH:'Africa',KE:'Africa',TZ:'Africa',UG:'Africa',RW:'Africa',ET:'Africa',SN:'Africa',
  CI:'Africa',CM:'Africa',MZ:'Africa',ZW:'Africa',ZM:'Africa',AO:'Africa',MG:'Africa',
  MU:'Africa',SC:'Africa',NA:'Africa',BW:'Africa',
  AU:'Oceania',NZ:'Oceania',FJ:'Oceania',PG:'Oceania',SB:'Oceania',VU:'Oceania',
  WS:'Oceania',TO:'Oceania',PF:'Oceania',
}
const CONTINENT_ORDER_LIST = ['Europe', 'Asia', 'Americas', 'Africa', 'Oceania', 'Other']
const MONTH_NUM: Record<string, number> = {
  Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12,
}
const SEASON_RANGE: Record<string, string> = {
  Spring:'Mar – May', Summer:'Jun – Aug', Autumn:'Sep – Nov', Winter:'Dec – Feb',
}

function vYear(v: string) { const m = v.match(/\d{4}/); return m ? m[0] : '—' }
function vMonth(v: string) { const m = v.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/); return m ? MONTH_NUM[m[1]] ?? null : null }
function vSeason(mo: number) { return mo>=3&&mo<=5?'Spring':mo>=6&&mo<=8?'Summer':mo>=9&&mo<=11?'Autumn':'Winter' }
function vStripYear(v: string) { return v.replace(/\s*\d{4}/, '').replace(/\s*·\s*$/, '').trim() }

export default function DashboardPage() {
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCity, setSelectedCity] = useState<{ countryCode: string; cityName: string } | null>(null)
  const [expCache, setExpCache] = useState<Record<string, TripData[]>>({})
  const [expLoading, setExpLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [visitGroup, setVisitGroup] = useState<VisitGroupMode>('country')
  const [openPrefs, setOpenPrefs] = useState<Set<string>>(new Set())

  async function deleteAllData() {
    if (!confirm('Delete all your data? This cannot be undone.')) return
    setDeleting(true)
    try {
      await fetch(`${API_URL}/api/me`, { method: 'DELETE', credentials: 'include' })
      window.location.href = '/'
    } finally {
      setDeleting(false)
    }
  }

  async function selectCity(countryCode: string, cityName: string) {
    const key = `${countryCode}:${cityName}`
    if (selectedCity?.countryCode === countryCode && selectedCity?.cityName === cityName) {
      setSelectedCity(null)
      return
    }
    setSelectedCity({ countryCode, cityName })
    if (expCache[key]) return
    setExpLoading(true)
    try {
      const r = await fetch(`${API_URL}/api/experiences/${countryCode}`, { credentials: 'include' })
      if (r.ok) {
        const d = await r.json()
        const entries: Record<string, TripData[]> = {}
        for (const trip of (d.trips ?? []) as TripData[]) {
          const k = `${countryCode}:${trip.city}`
          entries[k] = [...(entries[k] ?? []), trip]
        }
        setExpCache(prev => ({ ...prev, ...entries }))
      }
    } finally {
      setExpLoading(false)
    }
  }

  useEffect(() => {
    fetch(`${API_URL}/api/me`, { credentials: 'include' })
      .then(r => r.json())
      .then((data: MeResponse) => setMe(data))
      .finally(() => setLoading(false))
  }, [])

  const _countries = me?.profile?.countries_visited ?? []

  const visitsByYear = useMemo(() => {
    const map: Record<string, VisitItem[]> = {}
    for (const c of _countries)
      for (const city of c.cities)
        for (const v of city.visits) {
          const yr = vYear(v)
          ;(map[yr] ??= []).push({ countryCode: c.code, countryName: c.name, cityName: city.name, visit: v })
        }
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [_countries])

  const visitsByContinent = useMemo(() => {
    const map: Record<string, CountryVisit[]> = {}
    for (const c of _countries) {
      const cont = CONTINENT_MAP[c.code] ?? 'Other'
      ;(map[cont] ??= []).push(c)
    }
    return CONTINENT_ORDER_LIST.filter(k => map[k]).map(k => ({ continent: k, list: map[k] }))
  }, [_countries])

  const visitsBySeason = useMemo(() => {
    const map: Record<string, VisitItem[]> = {}
    for (const c of _countries)
      for (const city of c.cities)
        for (const v of city.visits) {
          const mo = vMonth(v)
          if (!mo) continue
          const s = vSeason(mo)
          ;(map[s] ??= []).push({ countryCode: c.code, countryName: c.name, cityName: city.name, visit: v })
        }
    return ['Spring','Summer','Autumn','Winter'].filter(s => map[s]).map(s => ({ season: s, items: map[s] }))
  }, [_countries])

  /* ── Loading ──────────────────────────────────────────────────── */
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

  /* ── Not connected ─────────────────────────────────────────────── */
  if (!me?.connected) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 1.5rem 3rem' }}>
        <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>

          <div className="fade-up" style={{ marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-accent)', fontWeight: 600 }}>
              Travel Intelligence
            </span>
          </div>

          <h1 className="fade-up d-100" style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.8rem, 7vw, 5rem)',
            fontWeight: 600,
            lineHeight: 1.1,
            color: 'var(--text)',
            marginBottom: '1.25rem',
            letterSpacing: '-0.02em',
          }}>
            Uncover Your<br />
            <span style={{ color: 'var(--text-accent)' }}>Travel DNA</span>
          </h1>

          <p className="fade-up d-200" style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: '2.5rem', lineHeight: 1.7 }}>
            Connect your Gmail inbox. We scan your booking history locally
            and build a rich preference profile — email bodies never leave your device.
          </p>

          <div className="fade-up d-300">
            <a href={`${API_URL}/auth`} className="btn btn-primary" style={{ fontSize: '0.95rem', padding: '0.75rem 1.75rem' }}>
              Connect Gmail
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          </div>

          {/* Trust badge */}
          <div className="fade-up d-400 glass-subtle" style={{
            marginTop: '3rem',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            textAlign: 'left',
          }}>
            <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>🔒</span>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.2rem' }}>Privacy-first by design</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Email bodies are processed locally via msgvault. Only metadata and preference signals reach the cloud.
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── Connected ─────────────────────────────────────────────────── */
  const profile = me.profile
  const prefs = profile?.preferences
    ? Object.entries(profile.preferences as Record<string, Preference>).sort(
        ([, a], [, b]) => b.total - a.total
      )
    : []
  const countries = profile?.countries_visited ?? []

  return (
    <div style={{ minHeight: '100vh', padding: '88px 1.5rem 4rem', maxWidth: 680, margin: '0 auto' }}>

      {/* Header row */}
      <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
            Your Profile
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{me.user_email}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={deleteAllData} disabled={deleting} className="btn btn-ghost" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {deleting ? 'Deleting...' : 'Delete all data'}
          </button>
          <a href={`${API_URL}/disconnect`} className="btn btn-ghost" style={{ fontSize: '0.78rem' }}>
            Disconnect
          </a>
        </div>
      </div>

      {/* Stats */}
      {profile && (
        <>
          <div className="fade-up d-200" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
            {[
              { label: 'Emails',       value: profile.email_count ?? 0 },
              { label: 'Countries', value: countries.length },
              { label: 'Preferences',  value: prefs.length },
            ].map(({ label, value }) => (
              <div key={label} className="glass-subtle" style={{ borderRadius: 'var(--radius-lg)', padding: '1.1rem', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
              </div>
            ))}
          </div>

        </>
      )}

      {/* World map */}
      {countries.length > 0 && (
        <div style={{ marginTop: '1.5rem' }}>
          <WorldMap countries={countries} onCitySelect={selectCity} />
        </div>
      )}

      {/* Places visited cards */}
      {countries.length > 0 && (
        <div className="fade-up d-400" style={{ marginTop: '1.5rem', width: 'min(1100px, calc(100vw - 3rem))', marginLeft: 'min(0px, calc((100% - min(1100px, calc(100vw - 3rem))) / 2))' }}>
          {/* Header + group-by tabs */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                Places Visited
              </h2>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.25rem 0 0', opacity: 0.6 }}>
                Click a city to view trip details
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {(['country', 'year', 'continent', 'season'] as VisitGroupMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setVisitGroup(mode)}
                  style={{
                    fontSize: '0.72rem', padding: '0.22rem 0.65rem',
                    borderRadius: 'var(--radius-sm)', border: '1px solid', cursor: 'pointer',
                    background: visitGroup === mode ? 'rgba(0,212,170,0.1)' : 'none',
                    borderColor: visitGroup === mode ? 'rgba(0,212,170,0.45)' : 'rgba(255,255,255,0.08)',
                    color: visitGroup === mode ? 'var(--text-accent)' : 'var(--text-muted)',
                    transition: 'all 150ms',
                    textTransform: 'capitalize',
                  }}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Country view — card grid (default) */}
          {visitGroup === 'country' && (
            <div style={{ columns: '4 240px', columnGap: '0.875rem' }}>
              {countries.map((country, i) => (
                <div
                  key={country.name}
                  className={`fade-up d-${Math.min(i + 1, 6) * 100 as 100|200|300|400|500|600} glass-subtle`}
                  style={{ breakInside: 'avoid', marginBottom: '0.875rem', borderRadius: 'var(--radius-lg)', padding: '1.1rem 1.25rem', border: '1px solid var(--border)' }}
                >
                  <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span aria-hidden="true">{flagEmoji(country.code)}</span>
                    {country.name}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {country.cities.map(city => (
                      <div
                        key={city.name}
                        className="city-row"
                        onClick={() => selectCity(country.code, city.name)}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', padding: '0.4rem 0.6rem', margin: '0 -0.6rem' }}
                      >
                        <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{city.name}</span>
                        {city.visits.length > 0 && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>{city.visits[0]}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Year view */}
          {visitGroup === 'year' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {visitsByYear.map(([year, items]) => (
                <div key={year}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>{year}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{items.length} {items.length === 1 ? 'visit' : 'visits'}</span>
                  </div>
                  <div className="glass-subtle" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '0.25rem 0.75rem' }}>
                    {items.map((item, i) => (
                      <div
                        key={i}
                        onClick={() => selectCity(item.countryCode, item.cityName)}
                        className="city-row"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}
                      >
                        <span style={{ fontSize: '0.88rem', lineHeight: 1, flexShrink: 0 }}>{flagEmoji(item.countryCode)}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text)', flex: 1 }}>
                          {item.countryName} <span style={{ color: 'var(--text-muted)' }}>·</span> {item.cityName}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>{vStripYear(item.visit)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Continent view */}
          {visitGroup === 'continent' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {visitsByContinent.map(({ continent, list }) => (
                <div key={continent}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>{continent}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{list.length} {list.length === 1 ? 'country' : 'countries'}</span>
                  </div>
                  <div style={{ columns: '4 240px', columnGap: '0.875rem' }}>
                    {list.map((country, i) => (
                      <div
                        key={country.name}
                        className="glass-subtle"
                        style={{ breakInside: 'avoid', marginBottom: '0.875rem', borderRadius: 'var(--radius-lg)', padding: '1.1rem 1.25rem', border: '1px solid var(--border)' }}
                      >
                        <h3 style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span aria-hidden="true">{flagEmoji(country.code)}</span>
                          {country.name}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {country.cities.map(city => (
                            <div
                              key={city.name}
                              className="city-row"
                              onClick={() => selectCity(country.code, city.name)}
                              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.5rem', padding: '0.4rem 0.6rem', margin: '0 -0.6rem' }}
                            >
                              <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{city.name}</span>
                              {city.visits.length > 0 && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>{city.visits[0]}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Season view */}
          {visitGroup === 'season' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {visitsBySeason.map(({ season, items }) => (
                <div key={season}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)' }}>{season}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{SEASON_RANGE[season]}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-muted)' }}>{items.length}</span>
                  </div>
                  <div className="glass-subtle" style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '0.25rem 0.75rem' }}>
                    {items.map((item, i) => (
                      <div
                        key={i}
                        onClick={() => selectCity(item.countryCode, item.cityName)}
                        className="city-row"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}
                      >
                        <span style={{ fontSize: '0.88rem', lineHeight: 1, flexShrink: 0 }}>{flagEmoji(item.countryCode)}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text)', flex: 1 }}>
                          {item.countryName} <span style={{ color: 'var(--text-muted)' }}>·</span> {item.cityName}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>{item.visit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Activity Preferences */}
      {prefs.length > 0 && (
        <div className="fade-up d-300 glass" style={{ borderRadius: 'var(--radius-xl)', padding: '1.5rem', marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
            Activity Preferences
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {prefs.map(([category, data], i) => {
              const isOpen = openPrefs.has(category)
              const toggle = () => setOpenPrefs(prev => {
                const next = new Set(prev)
                isOpen ? next.delete(category) : next.add(category)
                return next
              })
              return (
                <div key={category} className={`fade-in d-${Math.min(i + 1, 6) * 100 as 100 | 200 | 300 | 400 | 500 | 600}`}
                  style={{ borderBottom: '1px solid var(--border)' }}>
                  <button
                    onClick={toggle}
                    style={{
                      width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '0.7rem 0', background: 'none', border: 'none', cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>
                      {category.replace(/_/g, ' ')}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                        {data.total}
                      </span>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true"
                        style={{ color: 'var(--text-muted)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>
                        <path d="M1.5 3.5l3.5 3 3.5-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </button>
                  {isOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '0.6rem' }}>
                      {[...data.keywords].sort((a, b) => b.count - a.count).map(kw => (
                        <div key={kw.keyword} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                          padding: '0.2rem 0.4rem', margin: '0 -0.4rem',
                          borderRadius: 'var(--radius-sm)',
                        }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{kw.keyword}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{kw.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <Link href="/scan" style={{ fontSize: '0.8rem', color: 'var(--text-accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
            >
              View full results
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M2.5 6h7M6 2.5l3.5 3.5L6 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
          </div>
        </div>
      )}

      {/* Experiences popup */}
      {selectedCity && (
        <div
          onClick={() => setSelectedCity(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="glass fade-in"
            style={{
              borderRadius: 'var(--radius-xl)', padding: '1.75rem',
              width: '100%', maxWidth: 420,
              border: '1px solid var(--border)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {flagEmoji(selectedCity.countryCode)} {countries.find(c => c.code === selectedCity.countryCode)?.name}
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                {selectedCity.cityName}
              </h2>
            </div>

            {/* Experiences */}
            {(() => {
              const trips = expCache[`${selectedCity.countryCode}:${selectedCity.cityName}`]
              if (expLoading && !trips) {
                return <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>Loading…</p>
              }
              if (!trips || trips.flatMap(t => t.experiences).length === 0) {
                return <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>No experiences detected for this trip.</p>
              }
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {trips.map((trip, i) => (
                    <div key={i}>
                      {trip.label && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.5rem', letterSpacing: '0.03em' }}>
                          {trip.label}
                        </div>
                      )}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                        {trip.experiences.map(exp => (
                          <span key={exp.category} style={{
                            fontSize: '0.75rem', color: 'var(--text-accent)',
                            background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.3)',
                            borderRadius: 'var(--radius-md)', padding: '0.3rem 0.7rem',
                          }}>
                            {CATEGORY_LABEL[exp.category] ?? exp.category.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}

            <button
              onClick={() => setSelectedCity(null)}
              style={{
                marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-muted)',
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!profile && (
        <div className="fade-up d-200 glass-subtle" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✈️</div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Run your first scan to build your travel profile.</p>
          <Link href="/email-scan" className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
            Scan Emails
          </Link>
        </div>
      )}
    </div>
  )
}
