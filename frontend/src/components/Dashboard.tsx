import { useState, useCallback, useEffect } from 'react'
import GridLayout, { Layout } from 'react-grid-layout'
import 'react-grid-layout/css/styles.css'
import 'react-resizable/css/styles.css'

import { StandingsWidget }       from './widgets/StandingsWidget'
import { PythagoreanWidget }     from './widgets/PythagoreanWidget'
import { FormWidget }            from './widgets/FormWidget'
import { ResultsWidget }         from './widgets/ResultsWidget'
import { LeagueStatsWidget }     from './widgets/LeagueStatsWidget'
import { HomeAwayWidget }        from './widgets/HomeAwayWidget'
import { GoalTrendsWidget }      from './widgets/GoalTrendsWidget'
import { CleanSheetsWidget }     from './widgets/CleanSheetsWidget'
import { StreaksWidget }         from './widgets/StreaksWidget'
import { EloWidget }             from './widgets/EloWidget'
import { FormTableWidget }       from './widgets/FormTableWidget'
import { H2HMatrixWidget }       from './widgets/H2HMatrixWidget'
import { ScorelineWidget }       from './widgets/ScorelineWidget'
import { TitleRelegationWidget } from './widgets/TitleRelegationWidget'
import { PointsPaceWidget }      from './widgets/PointsPaceWidget'
import { PositionsWidget }       from './widgets/PositionsWidget'
import { RoundSummaryWidget }    from './widgets/RoundSummaryWidget'
import { UpcomingMatchesWidget } from './widgets/UpcomingMatchesWidget'

import type { DashboardData, WidgetId } from '../types'
import { ArrowLeft, Eye, EyeOff, RotateCcw, RefreshCw, Settings } from 'lucide-react'

interface Props {
  data: DashboardData
  onRefresh: () => void
  isRefreshing: boolean
  activeSection: string
  onTeamClick: (name: string) => void
}

const DEFAULT_LAYOUT: Layout[] = [
  { i: 'round_summary',       x: 0, y: 0,   w: 12, h: 14 },
  { i: 'standings',           x: 0, y: 14,  w: 8,  h: 11 },
  { i: 'league_stats',        x: 8, y: 14,  w: 4,  h: 11 },
  { i: 'pythagorean',         x: 0, y: 25,  w: 6,  h: 14 },
  { i: 'form',                x: 6, y: 25,  w: 6,  h: 14 },
  { i: 'results',             x: 0, y: 39,  w: 6,  h: 12 },
  { i: 'home_away',           x: 6, y: 39,  w: 6,  h: 12 },
  { i: 'upcoming_matches',    x: 0, y: 51,  w: 6,  h: 14 },
  { i: 'positions_over_time', x: 6, y: 51,  w: 6,  h: 14 },
  { i: 'goals_trend',         x: 0, y: 65,  w: 6,  h: 15 },
  { i: 'clean_sheets',        x: 6, y: 65,  w: 6,  h: 15 },
  { i: 'streaks',             x: 0, y: 80,  w: 12, h: 10 },
  { i: 'elo',                 x: 0, y: 90,  w: 6,  h: 20 },
  { i: 'form_table',          x: 6, y: 90,  w: 6,  h: 14 },
  { i: 'title_relegation',    x: 0, y: 110, w: 7,  h: 16 },
  { i: 'points_pace',         x: 7, y: 110, w: 5,  h: 16 },
  { i: 'h2h_matrix',          x: 0, y: 126, w: 12, h: 20 },
  { i: 'scoreline_stats',     x: 0, y: 146, w: 6,  h: 18 },
]

const WIDGET_LABELS: Record<WidgetId, string> = {
  round_summary:       'Podsumowanie kolejki',
  upcoming_matches:    'Terminarz',
  standings:           'Tabela',
  pythagorean:         'Pitagoras',
  form:                'Forma',
  results:             'Wyniki',
  league_stats:        'Liga',
  home_away:           'Dom/Wyjazd',
  goals_trend:         'Trendy goli',
  clean_sheets:        'Defensywa',
  streaks:             'Passy',
  schedule:            'Terminarz',
  elo:                 'Ranking Elo',
  form_table:          'Forma 5 meczów',
  h2h_matrix:          'H2H Matrix',
  scoreline_stats:     'Wyniki meczów',
  title_relegation:    'Awans/Play-off',
  points_pace:         'Projekcja sezonu',
  positions_over_time: 'Pozycje w czasie',
}

const WIDGET_ICONS: Record<WidgetId, string> = {
  round_summary: '📰', upcoming_matches: '📆', standings: '🏆', pythagorean: '📐', form: '📈',
  results: '📅', league_stats: '📊', home_away: '🏟️', goals_trend: '📉',
  clean_sheets: '🛡️', streaks: '🔥', schedule: '🗓️',
  elo: '⚡', form_table: '🔥', h2h_matrix: '⚔️',
  scoreline_stats: '🎯', title_relegation: '🏁', points_pace: '📈',
  positions_over_time: '📉',
}

// Which widgets are shown for each sidebar section
const SECTION_WIDGETS: Record<string, WidgetId[]> = {
  tabela:     ['standings', 'league_stats', 'title_relegation', 'points_pace'],
  wyniki:     ['results', 'scoreline_stats', 'round_summary'],
  terminarz:  ['upcoming_matches', 'results'],
  forma:      ['form', 'form_table', 'streaks', 'positions_over_time', 'elo'],
  statystyki: ['pythagorean', 'home_away', 'goals_trend', 'clean_sheets', 'h2h_matrix'],
  wszystko:   [], // empty = show all
}

const STORAGE_KEY = 'bytom-dashboard-layout-v7'
const HIDDEN_KEY  = 'bytom-dashboard-hidden-v7'

// Mobile widget order (most important first)
const MOBILE_WIDGET_ORDER: WidgetId[] = [
  'round_summary', 'standings', 'upcoming_matches', 'results', 'form', 'positions_over_time',
  'form_table', 'elo', 'title_relegation', 'points_pace',
  'pythagorean', 'home_away', 'goals_trend', 'clean_sheets',
  'streaks', 'h2h_matrix', 'scoreline_stats', 'league_stats',
]

function loadLayout(): Layout[] {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    return (Array.isArray(saved) && saved.length > 0) ? saved : DEFAULT_LAYOUT
  }
  catch { return DEFAULT_LAYOUT }
}
function loadHidden(): Set<WidgetId> {
  try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]')) }
  catch { return new Set() }
}

export function Dashboard({ data, onRefresh, isRefreshing, activeSection, onTeamClick }: Props) {
  const [layout, setLayout]         = useState<Layout[]>(loadLayout)
  const [hidden, setHidden]         = useState<Set<WidgetId>>(loadHidden)
  const [showPanel, setPanel]       = useState(false)
  const [containerWidth, setW]      = useState(1280)
  const [isMobile, setIsMobile]     = useState(() => window.innerWidth < 768)
  const [mobileWidget, setMobileWidget] = useState<WidgetId | null>(null)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const obs = new ResizeObserver(entries => setW(entries[0].contentRect.width))
    obs.observe(node)
  }, [])

  const handleLayoutChange = (changed: Layout[]) => {
    // Merge changed items back into the full layout so filtered sections
    // don't overwrite widgets they don't know about
    setLayout(prev => {
      const changedById = Object.fromEntries(changed.map(l => [l.i, l]))
      const merged = prev.map(l => changedById[l.i] ?? l)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged))
      return merged
    })
  }

  const toggleWidget = (id: WidgetId) => {
    setHidden(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem(HIDDEN_KEY, JSON.stringify([...next]))
      return next
    })
  }

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT)
    setHidden(new Set())
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(HIDDEN_KEY)
  }

  const teams = data.advanced_teams?.length ? data.advanced_teams : []

  const renderWidget = (id: WidgetId) => {
    if (!isMobile && hidden.has(id)) return null
    switch (id) {
      case 'standings':    return <StandingsWidget teams={teams} onTeamClick={onTeamClick} />
      case 'pythagorean':  return <PythagoreanWidget teams={teams} />
      case 'form':         return <FormWidget teams={teams} />
      case 'results':      return <ResultsWidget results={data.results ?? []} />
      case 'league_stats': return data.league ? <LeagueStatsWidget stats={data.league} /> : null
      case 'home_away':    return teams.length ? <HomeAwayWidget teams={teams} /> : null
      case 'goals_trend':  return teams.length ? <GoalTrendsWidget teams={teams} /> : null
      case 'clean_sheets': return <CleanSheetsWidget teams={teams} />
      case 'streaks':          return <StreaksWidget teams={teams} />
      case 'elo':              return data.elo?.length ? <EloWidget elo={data.elo} /> : null
      case 'form_table':       return data.form_table?.length ? <FormTableWidget formTable={data.form_table} onTeamClick={onTeamClick} /> : null
      case 'h2h_matrix':       return data.h2h_matrix?.teams.length ? <H2HMatrixWidget h2h={data.h2h_matrix} /> : null
      case 'scoreline_stats':  return data.scoreline_stats ? <ScorelineWidget stats={data.scoreline_stats} /> : null
      case 'title_relegation': return data.title_relegation?.length ? <TitleRelegationWidget data={data.title_relegation} /> : null
      case 'points_pace':         return data.title_relegation?.length ? <PointsPaceWidget data={data.title_relegation} /> : null
      case 'positions_over_time': return data.positions_over_time?.rounds.length ? <PositionsWidget data={data.positions_over_time} /> : null
      case 'round_summary':       return <RoundSummaryWidget summary={data.round_summary} />
      case 'upcoming_matches':    return <UpcomingMatchesWidget schedule={data.schedule ?? []} teams={teams.map(t => t.name)} />
      default: return null
    }
  }

  const lg = data.league
  const statBar = lg ? [
    { label: 'Mecze',        value: lg.total_matches,          color: 'text-[#e8f0ec]' },
    { label: 'Bramki',       value: lg.total_goals,             color: 'text-[#e8f0ec]' },
    { label: 'Śr. goli',     value: lg.avg_goals_per_match,     color: 'text-[#fbbf24]' },
    { label: 'BTTS',         value: `${lg.btts_pct}%`,          color: 'text-[#22d3ee]' },
    { label: 'Over 2.5',     value: `${lg.over_25_pct}%`,       color: 'text-[#fb923c]' },
    { label: 'Wygr. gosp.', value: `${lg.home_win_pct}%`,      color: 'text-[#22c55e]' },
    { label: 'Remisy',       value: `${lg.draw_pct}%`,          color: 'text-[#fbbf24]' },
    { label: 'Wygr. gości', value: `${lg.away_win_pct}%`,      color: 'text-[#ef4444]' },
  ] : []

  // ── MOBILE VIEW ──────────────────────────────────────────────────────────
  if (isMobile) {

    // Full-screen single widget view
    if (mobileWidget) {
      const widget = renderWidget(mobileWidget)
      return (
        <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
          {/* Widget header */}
          <header style={{
            background: 'linear-gradient(180deg, #091510 0%, #0d1f17 100%)',
            borderBottom: '1px solid var(--card-bd)',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            position: 'sticky',
            top: 0,
            zIndex: 50,
          }}>
            <button
              onClick={() => setMobileWidget(null)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                color: 'var(--green)', fontSize: '14px', fontWeight: 600,
                padding: '6px 10px', borderRadius: '8px',
                background: 'rgba(34,197,94,0.1)',
                border: '1px solid rgba(34,197,94,0.25)',
              }}
            >
              <ArrowLeft size={16} />
              Wróć
            </button>
            <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: '15px' }}>
              {WIDGET_ICONS[mobileWidget]}&nbsp;{WIDGET_LABELS[mobileWidget]}
            </span>
          </header>

          <div style={{ padding: '12px' }}>
            {widget
              ? widget
              : <p style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: '3rem', fontSize: '14px' }}>
                  Brak danych dla tego widgetu
                </p>
            }
          </div>

          <footer style={{ textAlign: 'center', padding: '16px', fontSize: '11px', color: 'var(--text-muted)' }}>
            Dane: regionalnyfutbol.pl · 90minut.pl
          </footer>
        </div>
      )
    }

    // Mobile home — widget card list
    const isAvailable = (id: WidgetId): boolean => {
      switch (id) {
        case 'league_stats':        return !!data.league
        case 'elo':                 return !!(data.elo?.length)
        case 'form_table':          return !!(data.form_table?.length)
        case 'h2h_matrix':          return !!(data.h2h_matrix?.teams.length)
        case 'scoreline_stats':     return !!data.scoreline_stats
        case 'title_relegation':    return !!(data.title_relegation?.length)
        case 'points_pace':         return !!(data.title_relegation?.length)
        case 'positions_over_time': return !!(data.positions_over_time?.rounds.length)
        default:                    return teams.length > 0
      }
    }

    return (
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

        {/* Mobile header */}
        <header style={{
          background: 'linear-gradient(180deg, #091510 0%, #0d1f17 100%)',
          borderBottom: '1px solid var(--card-bd)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
          padding: '12px 16px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%', fontSize: '20px',
                background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                boxShadow: '0 0 16px rgba(34,197,94,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>⚽</div>
              <div>
                <h1 style={{ color: 'var(--text)', fontWeight: 700, fontSize: '15px', letterSpacing: '0.05em', fontFamily: "'Oswald', sans-serif" }}>
                  B-KLASA BYTOM
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                  Sezon 2025/2026 · {teams.length} drużyn
                </p>
              </div>
            </div>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              style={{
                background: 'linear-gradient(135deg, #16a34a, #22c55e)',
                color: '#0f172a', padding: '7px 12px', borderRadius: '8px',
                fontSize: '12px', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: '5px',
                opacity: isRefreshing ? 0.6 : 1,
              }}
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? '...' : 'Odśwież'}
            </button>
          </div>

          {/* Stats scrollbar */}
          {statBar.length > 0 && (
            <div style={{
              marginTop: '10px',
              display: 'flex', gap: '14px',
              overflowX: 'auto', paddingBottom: '2px',
              borderTop: '1px solid rgba(30,58,42,0.5)',
              paddingTop: '8px',
            }}>
              {statBar.map(s => (
                <div key={s.label} className="shrink-0 flex items-center gap-1" style={{ fontSize: '11px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{s.label}:</span>
                  <span className={`font-bold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          )}
        </header>

        {/* Widget cards grid */}
        <div style={{
          padding: '14px',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '10px',
        }}>
          {MOBILE_WIDGET_ORDER.map(id => {
            const available = isAvailable(id)
            return (
              <button
                key={id}
                onClick={() => available && setMobileWidget(id)}
                style={{
                  background: available
                    ? 'var(--card-bg)'
                    : 'rgba(9,21,16,0.5)',
                  border: `1px solid ${available ? 'var(--card-bd)' : 'rgba(30,58,42,0.25)'}`,
                  borderRadius: '12px',
                  padding: '16px 10px',
                  textAlign: 'center',
                  cursor: available ? 'pointer' : 'default',
                  opacity: available ? 1 : 0.45,
                  transition: 'transform 0.1s, box-shadow 0.1s',
                  boxShadow: available ? '0 2px 12px rgba(0,0,0,0.4)' : 'none',
                }}
                onTouchStart={e => available && ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)')}
                onTouchEnd={e => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
              >
                <div style={{ fontSize: '30px', marginBottom: '7px', lineHeight: 1 }}>
                  {WIDGET_ICONS[id]}
                </div>
                <div style={{
                  color: available ? 'var(--text)' : 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: 600,
                  lineHeight: 1.3,
                }}>
                  {WIDGET_LABELS[id]}
                </div>
              </button>
            )
          })}
        </div>

        <footer style={{ textAlign: 'center', padding: '16px 16px 28px', fontSize: '11px', color: 'var(--text-muted)' }}>
          Dane: regionalnyfutbol.pl · 90minut.pl · Odświeżanie co 15 min
        </footer>
      </div>
    )
  }

  // ── DESKTOP VIEW ─────────────────────────────────────────────────────────
  const sectionFilter = SECTION_WIDGETS[activeSection] ?? []
  const visibleLayout = layout.filter(l => !hidden.has(l.i as WidgetId))

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Desktop Hero Header ──────────────────────────── */}
      <div className="pitch-stripes" style={{
        padding: '28px 32px 20px',
        borderBottom: '1px solid var(--card-bd)',
        background: 'linear-gradient(180deg, #091510 0%, var(--bg) 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        <div style={{
          position: 'absolute', right: -80, top: -80,
          width: 320, height: 320, borderRadius: '50%',
          border: '1px solid rgba(34,197,94,0.06)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', right: -40, top: -40,
          width: 200, height: 200, borderRadius: '50%',
          border: '1px solid rgba(34,197,94,0.08)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div className="live-dot" />
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                B-Klasa Bytom · Sezon 2025/2026
              </span>
            </div>
            <h1 style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: 42,
              fontWeight: 700,
              lineHeight: 1,
              color: '#e8f0ec',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}>
              LIGA
            </h1>
            <h1 style={{
              fontFamily: "'Oswald', sans-serif",
              fontSize: 42,
              fontWeight: 700,
              fontStyle: 'italic',
              lineHeight: 1,
              color: 'var(--green)',
              letterSpacing: '0.02em',
              textTransform: 'uppercase',
            }}>
              BYTOM
            </h1>
          </div>

          {/* Right side controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px',
                background: isRefreshing ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.12)',
                border: '1px solid rgba(34,197,94,0.3)',
                borderRadius: 8,
                color: 'var(--green)',
                fontSize: 12,
                fontWeight: 600,
                cursor: isRefreshing ? 'not-allowed' : 'pointer',
                letterSpacing: '0.04em',
                transition: 'all 0.15s',
              }}
            >
              <RefreshCw size={13} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'ODŚWIEŻANIE...' : 'ODŚWIEŻ'}
            </button>
            {activeSection === 'wszystko' && (
              <button
                onClick={() => setPanel(p => !p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px',
                  background: showPanel ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${showPanel ? 'rgba(34,197,94,0.4)' : 'var(--card-bd)'}`,
                  borderRadius: 8,
                  color: showPanel ? 'var(--green)' : 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                  transition: 'all 0.15s',
                }}
              >
                <Settings size={13} />
                WIDGETY
              </button>
            )}
            <button
              onClick={resetLayout}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--card-bd)',
                borderRadius: 8,
                color: 'var(--text-muted)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                transition: 'all 0.15s',
              }}
            >
              <RotateCcw size={13} />
              RESET
            </button>
          </div>
        </div>

        {/* Widget toggle panel — only in full dashboard view */}
        {showPanel && activeSection === 'wszystko' && (
          <div style={{
            marginTop: 16,
            paddingTop: 14,
            borderTop: '1px solid var(--card-bd)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 6,
          }}>
            {(Object.keys(WIDGET_LABELS) as WidgetId[]).filter(id => id !== 'schedule').map(id => (
              <button key={id} onClick={() => toggleWidget(id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 11, padding: '5px 10px', borderRadius: 8,
                  background: hidden.has(id) ? 'rgba(18,34,24,0.6)' : 'rgba(34,197,94,0.1)',
                  border: `1px solid ${hidden.has(id) ? 'rgba(30,58,42,0.5)' : 'rgba(34,197,94,0.3)'}`,
                  color: hidden.has(id) ? 'var(--text-muted)' : 'var(--green)',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                {hidden.has(id) ? <EyeOff size={10} /> : <Eye size={10} />}
                {WIDGET_ICONS[id]} {WIDGET_LABELS[id]}
              </button>
            ))}
          </div>
        )}

        {/* Stats bar */}
        {statBar.length > 0 && (
          <div style={{
            marginTop: 14,
            paddingTop: 12,
            borderTop: '1px solid rgba(30,58,42,0.5)',
            display: 'flex',
            gap: 20,
            overflowX: 'auto',
          }}>
            {statBar.map(s => (
              <div key={s.label} className="flex items-center gap-1.5 shrink-0 text-xs">
                <span style={{ color: 'var(--text-muted)' }}>{s.label}:</span>
                <span className={`font-bold ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Grid / Section view ─────────────────────────── */}
      <div ref={containerRef} style={{ padding: '16px 24px' }}>
        {sectionFilter.length > 0 ? (
          // Section view: simple 2-col responsive layout, no drag needed
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {sectionFilter.map(id => {
              if (hidden.has(id)) return null
              const widget = renderWidget(id)
              if (!widget) return null
              // Give wide widgets (like streaks, h2h) full width
              const fullWidth = ['streaks', 'h2h_matrix', 'scoreline_stats', 'round_summary', 'elo', 'positions_over_time'].includes(id)
              return (
                <div key={id} style={{ gridColumn: fullWidth ? '1 / -1' : 'auto', minHeight: 320 }}>
                  {widget}
                </div>
              )
            })}
          </div>
        ) : (
          // Full dashboard: draggable/resizable grid
          <GridLayout
            layout={visibleLayout}
            cols={12}
            rowHeight={36}
            width={containerWidth}
            onLayoutChange={handleLayoutChange}
            draggableHandle=".widget-header"
            draggableCancel="button,select,input,a,.no-drag"
            margin={[12, 12]}
            containerPadding={[0, 0]}
            resizeHandles={['se']}
            compactType="vertical"
          >
            {visibleLayout.map(item => {
              const widget = renderWidget(item.i as WidgetId)
              if (!widget) return null
              return <div key={item.i} className="cursor-default">{widget}</div>
            })}
          </GridLayout>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="text-center py-6 text-xs" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--card-bd)', marginTop: 8 }}>
        Dane: regionalnyfutbol.pl · 90minut.pl · laczynaspilka.pl &nbsp;|&nbsp; Odśwież co 15 min
      </footer>
    </div>
  )
}
