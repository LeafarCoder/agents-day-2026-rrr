'use client'

import { useState, useMemo, useCallback } from 'react'
import { ComposableMap, Geographies, Geography, ZoomableGroup } from '@vnedyalk0v/react19-simple-maps'

// ISO 3166-1 numeric (zero-padded 3-digit string) → alpha-2
const N2A: Record<string, string> = {
  "004":"AF","008":"AL","012":"DZ","016":"AS","020":"AD","024":"AO","028":"AG","031":"AZ",
  "032":"AR","036":"AU","040":"AT","044":"BS","048":"BH","050":"BD","052":"BB","056":"BE",
  "060":"BM","064":"BT","068":"BO","070":"BA","072":"BW","076":"BR","084":"BZ","090":"SB",
  "096":"BN","100":"BG","104":"MM","108":"BI","112":"BY","116":"KH","120":"CM","124":"CA",
  "132":"CV","140":"CF","144":"LK","148":"TD","152":"CL","156":"CN","158":"TW","170":"CO",
  "174":"KM","175":"YT","178":"CG","180":"CD","184":"CK","188":"CR","191":"HR","192":"CU",
  "196":"CY","203":"CZ","204":"BJ","208":"DK","212":"DM","214":"DO","218":"EC","222":"SV",
  "226":"GQ","231":"ET","232":"ER","233":"EE","238":"FK","242":"FJ","246":"FI","250":"FR",
  "258":"PF","262":"DJ","266":"GA","268":"GE","270":"GM","275":"PS","276":"DE","288":"GH",
  "296":"KI","300":"GR","308":"GD","320":"GT","324":"GN","328":"GY","332":"HT","340":"HN",
  "348":"HU","352":"IS","356":"IN","360":"ID","364":"IR","368":"IQ","372":"IE","376":"IL",
  "380":"IT","384":"CI","388":"JM","392":"JP","398":"KZ","400":"JO","404":"KE","408":"KP",
  "410":"KR","414":"KW","417":"KG","418":"LA","422":"LB","426":"LS","430":"LR","434":"LY",
  "438":"LI","440":"LT","442":"LU","450":"MG","454":"MW","458":"MY","462":"MV","466":"ML",
  "470":"MT","478":"MR","480":"MU","484":"MX","492":"MC","496":"MN","498":"MD","499":"ME",
  "504":"MA","508":"MZ","512":"OM","516":"NA","520":"NR","524":"NP","528":"NL","540":"NC",
  "548":"VU","554":"NZ","558":"NI","562":"NE","566":"NG","578":"NO","583":"FM","584":"MH",
  "585":"PW","586":"PK","591":"PA","598":"PG","600":"PY","604":"PE","608":"PH","616":"PL",
  "620":"PT","624":"GW","626":"TL","630":"PR","634":"QA","642":"RO","643":"RU","646":"RW",
  "659":"KN","662":"LC","670":"VC","674":"SM","678":"ST","682":"SA","686":"SN","690":"SC",
  "694":"SL","703":"SK","704":"VN","705":"SI","706":"SO","710":"ZA","716":"ZW","724":"ES",
  "728":"SS","729":"SD","740":"SR","748":"SZ","752":"SE","756":"CH","760":"SY","762":"TJ",
  "764":"TH","768":"TG","776":"TO","780":"TT","788":"TN","792":"TR","795":"TM","798":"TV",
  "800":"UG","804":"UA","807":"MK","818":"EG","826":"GB","834":"TZ","840":"US","854":"BF",
  "858":"UY","860":"UZ","862":"VE","882":"WS","887":"YE","894":"ZM",
}

const CONTINENT: Record<string, string> = {
  GB:'Europe',FR:'Europe',DE:'Europe',IT:'Europe',ES:'Europe',PT:'Europe',NL:'Europe',
  BE:'Europe',CH:'Europe',AT:'Europe',SE:'Europe',NO:'Europe',DK:'Europe',FI:'Europe',
  PL:'Europe',CZ:'Europe',HU:'Europe',RO:'Europe',GR:'Europe',HR:'Europe',SI:'Europe',
  SK:'Europe',BG:'Europe',RS:'Europe',ME:'Europe',BA:'Europe',MK:'Europe',AL:'Europe',
  UA:'Europe',BY:'Europe',LT:'Europe',LV:'Europe',EE:'Europe',IS:'Europe',IE:'Europe',
  LU:'Europe',MT:'Europe',CY:'Europe',TR:'Europe',MD:'Europe',GE:'Europe',AM:'Europe',AZ:'Europe',
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
const CONTINENT_ORDER = ['Europe', 'Asia', 'Americas', 'Africa', 'Oceania', 'Other']

const MONTH_NUM: Record<string, number> = {
  Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12,
}
const SEASON_SUB: Record<string, string> = {
  Spring:'Mar – May', Summer:'Jun – Aug', Autumn:'Sep – Nov', Winter:'Dec – Feb',
}

type CityVisit   = { name: string; visits: string[] }
type CountryData = { name: string; code: string; cities: CityVisit[] }
type VisitItem   = { countryCode: string; countryName: string; cityName: string; visit: string }
type ViewMode    = 'map' | 'country' | 'year' | 'continent' | 'season'

function flagEmoji(code: string) {
  return [...code.toUpperCase()].map(c =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join('')
}

function extractYear(v: string): string {
  const m = v.match(/\d{4}/)
  return m ? m[0] : 'Unknown'
}

function extractMonth(v: string): number | null {
  const m = v.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/)
  return m ? (MONTH_NUM[m[1]] ?? null) : null
}

function monthToSeason(n: number): string {
  if (n >= 3 && n <= 5) return 'Spring'
  if (n >= 6 && n <= 8) return 'Summer'
  if (n >= 9 && n <= 11) return 'Autumn'
  return 'Winter'
}

function stripYear(v: string): string {
  return v.replace(/\s*\d{4}/, '').replace(/\s*[·]\s*$/, '').trim()
}

function VisitRow({ countryCode, countryName, cityName, visit, onClick }: VisitItem & { onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        padding: '0.28rem 0.4rem', margin: '0 -0.4rem',
        borderRadius: 'var(--radius-sm)',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 120ms',
      }}
      onMouseEnter={e => { if (onClick) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
    >
      <span style={{ fontSize: '0.88rem', flexShrink: 0, lineHeight: 1 }}>{flagEmoji(countryCode)}</span>
      <span style={{ fontSize: '0.8rem', color: 'var(--text)', flex: 1, minWidth: 0 }}>
        {countryName} <span style={{ color: 'var(--text-muted)' }}>·</span> {cityName}
      </span>
      {visit && (
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>{visit}</span>
      )}
    </div>
  )
}

function GroupHeader({ label, sub, count }: { label: string; sub?: string; count?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.45rem', marginBottom: '0.4rem' }}>
      <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>{label}</span>
      {sub && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{sub}</span>}
      {count !== undefined && (
        <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>{count}</span>
      )}
    </div>
  )
}

const GEO_URL = '/world-110m.json'
const PROJ_CONFIG = { rotate: [-10, 0, 0] as [number, number, number], scale: 147 } as any

export default function WorldMap({
  countries,
  onCitySelect,
}: {
  countries: CountryData[]
  onCitySelect?: (countryCode: string, cityName: string) => void
}) {
  const [selected,   setSelected]   = useState<CountryData | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [view,       setView]       = useState<ViewMode>('map')

  const visitedMap = useMemo(
    () => new Map(countries.map(c => [c.code.toUpperCase(), c])),
    [countries]
  )

  const renderGeos = useCallback(
    ({ geographies }: { geographies: any[] }) =>
      geographies.map(geo => {
        const a2 = N2A[String(geo.id).padStart(3, '0')]
        const country = a2 ? visitedMap.get(a2) : undefined
        const visited = !!country
        return (
          <Geography
            key={geo.rsmKey}
            geography={geo}
            onClick={() => visited && setSelected(country!)}
            style={{
              default: {
                fill: visited ? 'rgba(0,212,170,0.22)' : 'rgba(255,255,255,0.05)',
                stroke: 'rgba(255,255,255,0.1)', strokeWidth: 0.4,
                outline: 'none', cursor: visited ? 'pointer' : 'default', transition: 'fill 120ms',
              },
              hover: {
                fill: visited ? 'rgba(0,212,170,0.45)' : 'rgba(255,255,255,0.09)',
                stroke: visited ? 'rgba(0,212,170,0.85)' : 'rgba(255,255,255,0.22)',
                strokeWidth: visited ? 1.2 : 0.4, outline: 'none',
                cursor: visited ? 'pointer' : 'default',
              },
              pressed: { fill: visited ? 'rgba(0,212,170,0.6)' : 'rgba(255,255,255,0.05)', outline: 'none' },
            }}
          />
        )
      }),
    [visitedMap]
  )

  // Derived groupings
  const byYear = useMemo(() => {
    const map: Record<string, VisitItem[]> = {}
    for (const c of countries)
      for (const city of c.cities)
        for (const v of city.visits) {
          const yr = extractYear(v)
          ;(map[yr] ??= []).push({ countryCode: c.code, countryName: c.name, cityName: city.name, visit: v })
        }
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a))
  }, [countries])

  const byContinent = useMemo(() => {
    const map: Record<string, CountryData[]> = {}
    for (const c of countries) {
      const cont = CONTINENT[c.code] ?? 'Other'
      ;(map[cont] ??= []).push(c)
    }
    return CONTINENT_ORDER.filter(k => map[k]).map(k => ({ continent: k, list: map[k] }))
  }, [countries])

  const bySeason = useMemo(() => {
    const map: Record<string, VisitItem[]> = {}
    for (const c of countries)
      for (const city of c.cities)
        for (const v of city.visits) {
          const month = extractMonth(v)
          if (!month) continue
          const season = monthToSeason(month)
          ;(map[season] ??= []).push({ countryCode: c.code, countryName: c.name, cityName: city.name, visit: v })
        }
    return ['Spring', 'Summer', 'Autumn', 'Winter'].filter(s => map[s]).map(s => ({ season: s, items: map[s] }))
  }, [countries])

  function MapCanvas({ zoomable }: { zoomable: boolean }) {
    return (
      <ComposableMap
        projectionConfig={PROJ_CONFIG}
        style={{ width: '100%', height: zoomable ? '100%' : 'auto', display: 'block' }}
      >
        {zoomable ? (
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>{renderGeos}</Geographies>
          </ZoomableGroup>
        ) : (
          <Geographies geography={GEO_URL}>{renderGeos}</Geographies>
        )}
      </ComposableMap>
    )
  }

  const TABS: { id: ViewMode; label: string }[] = [
    { id: 'map',       label: 'Map'       },
    { id: 'country',   label: 'Country'   },
    { id: 'year',      label: 'Year'      },
    { id: 'continent', label: 'Continent' },
    { id: 'season',    label: 'Season'    },
  ]

  return (
    <>
      {/* Main card */}
      <div
        className="fade-up d-400 glass"
        style={{ borderRadius: 'var(--radius-xl)', overflow: 'hidden', border: '1px solid var(--border)' }}
      >
        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <h2 style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
                Places Visited
              </h2>
              {countries.length > 0 && (
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.2rem 0 0', opacity: 0.5 }}>
                  {countries.length} {countries.length === 1 ? 'country' : 'countries'} · click to explore
                </p>
              )}
            </div>
            {view === 'map' && (
              <button
                onClick={() => setFullscreen(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                  fontSize: '0.72rem', color: 'var(--text-muted)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '0.35rem 0.6rem', borderRadius: 'var(--radius-sm)',
                  transition: 'color 150ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-accent)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                  <path d="M1.5 5V1.5H5M8 1.5h3.5V5M11.5 8v3.5H8M5 11.5H1.5V8"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Expand
              </button>
            )}
          </div>

          {/* Group-by tabs */}
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setView(tab.id)}
                style={{
                  fontSize: '0.72rem', padding: '0.22rem 0.65rem',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid',
                  cursor: 'pointer',
                  background: view === tab.id ? 'rgba(0,212,170,0.1)' : 'none',
                  borderColor: view === tab.id ? 'rgba(0,212,170,0.45)' : 'rgba(255,255,255,0.08)',
                  color: view === tab.id ? 'var(--text-accent)' : 'var(--text-muted)',
                  transition: 'all 150ms',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Map view */}
        {view === 'map' && (
          <div style={{ background: 'rgba(8,15,26,0.55)' }}>
            <MapCanvas zoomable={false} />
          </div>
        )}

        {/* List views */}
        {view !== 'map' && (
          <div style={{ padding: '1rem 1.25rem', maxHeight: 380, overflowY: 'auto' }}>

            {/* Country */}
            {view === 'country' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {countries.map(country => (
                  <div key={country.code}>
                    <GroupHeader
                      label={flagEmoji(country.code) + '  ' + country.name}
                      count={country.cities.length}
                    />
                    <div>
                      {country.cities.map(city => (
                        <div
                          key={city.name}
                          onClick={() => onCitySelect?.(country.code, city.name)}
                          style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                            padding: '0.28rem 0.4rem 0.28rem 1.4rem', margin: '0 -0.4rem',
                            borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'background 120ms',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                        >
                          <span style={{ fontSize: '0.8rem', color: 'var(--text)' }}>{city.name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                            {city.visits.join(' · ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Year */}
            {view === 'year' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {byYear.map(([year, items]) => (
                  <div key={year}>
                    <GroupHeader
                      label={year}
                      sub={items.length + (items.length === 1 ? ' visit' : ' visits')}
                    />
                    {items.map((item, i) => (
                      <VisitRow
                        key={i}
                        {...item}
                        visit={stripYear(item.visit)}
                        onClick={() => onCitySelect?.(item.countryCode, item.cityName)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}

            {/* Continent */}
            {view === 'continent' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {byContinent.map(({ continent, list }) => (
                  <div key={continent}>
                    <GroupHeader
                      label={continent}
                      sub={list.length + (list.length === 1 ? ' country' : ' countries')}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                      {list.map(country => (
                        <div key={country.code}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem', paddingLeft: '0.1rem' }}>
                            <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>{flagEmoji(country.code)}</span>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>{country.name}</span>
                          </div>
                          {country.cities.map(city => (
                            <div
                              key={city.name}
                              onClick={() => onCitySelect?.(country.code, city.name)}
                              style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                                padding: '0.22rem 0.4rem 0.22rem 1.6rem', margin: '0 -0.4rem',
                                borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: 'background 120ms',
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)' }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                            >
                              <span style={{ fontSize: '0.78rem', color: 'var(--text)' }}>{city.name}</span>
                              <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', flexShrink: 0 }}>{city.visits[0]}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Season */}
            {view === 'season' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                {bySeason.map(({ season, items }) => (
                  <div key={season}>
                    <GroupHeader
                      label={season}
                      sub={SEASON_SUB[season]}
                      count={items.length}
                    />
                    {items.map((item, i) => (
                      <VisitRow
                        key={i}
                        {...item}
                        onClick={() => onCitySelect?.(item.countryCode, item.cityName)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </div>

      {/* Country popup */}
      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 60,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="glass fade-in"
            style={{
              borderRadius: 'var(--radius-xl)', padding: '1.75rem',
              width: '100%', maxWidth: 360,
              border: '1px solid var(--border)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
              maxHeight: '80vh', overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '2.2rem', lineHeight: 1, marginBottom: '0.45rem' }}>
                  {flagEmoji(selected.code)}
                </div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                  {selected.name}
                </h2>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                  {selected.cities.length} {selected.cities.length === 1 ? 'city' : 'cities'} visited
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.4rem', lineHeight: 1, padding: '0.1rem 0.4rem', marginTop: '-0.2rem', flexShrink: 0 }}
              >
                x
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {selected.cities.map(city => (
                <div
                  key={city.name}
                  onClick={() => { setSelected(null); onCitySelect?.(selected.code, city.name) }}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    cursor: onCitySelect ? 'pointer' : 'default',
                    transition: 'background 120ms',
                  }}
                  onMouseEnter={e => { if (onCitySelect) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.07)' }}
                  onMouseLeave={e => { if (onCitySelect) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)' }}
                >
                  <div style={{
                    fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)',
                    marginBottom: city.visits.length > 0 ? '0.35rem' : 0,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    {city.name}
                    {onCitySelect && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                        <path d="M2 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  {city.visits.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                      {city.visits.map((v, i) => (
                        <span key={i} style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{v}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen overlay */}
      {fullscreen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 70,
          background: 'var(--bg)',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', flexShrink: 0,
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Places Visited — {countries.length} {countries.length === 1 ? 'country' : 'countries'}
            </span>
            <button
              onClick={() => setFullscreen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 150ms' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Close
            </button>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', background: 'rgba(8,15,26,0.8)' }}>
            <MapCanvas zoomable={true} />
          </div>
          <div style={{ padding: '0.6rem 1.5rem', borderTop: '1px solid var(--border)', fontSize: '0.68rem', color: 'var(--text-muted)', opacity: 0.4, textAlign: 'center' }}>
            Scroll to zoom · Drag to pan · Click a country to explore
          </div>
        </div>
      )}
    </>
  )
}
