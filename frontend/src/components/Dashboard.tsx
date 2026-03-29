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

import type { DashboardData, WidgetId } from '../types'
import { ArrowLeft, Eye, EyeOff, RotateCcw, RefreshCw, Settings } from 'lucide-react'

interface Props {
  data: DashboardData
  onRefresh: () => void
  isRefreshing: boolean
}

const DEFAULT_LAYOUT: Layout[] = [
  { i: 'round_summary',       x: 0, y: 0,   w: 12, h: 14 },
  { i: 'standings',           x: 0, y: 14,  w: 8,  h: 11 },
  { i: 'league_stats',        x: 8, y: 14,  w: 4,  h: 11 },
  { i: 'pythagorean',         x: 0, y: 25,  w: 6,  h: 14 },
  { i: 'form',                x: 6, y: 25,  w: 6,  h: 14 },
  { i: 'results',             x: 0, y: 39,  w: 6,  h: 12 },
  { i: 'home_away',           x: 6, y: 39,  w: 6,  h: 12 },
  { i: 'positions_over_time', x: 0, y: 51,  w: 12, h: 18 },
  { i: 'goals_trend',         x: 0, y: 69,  w: 6,  h: 15 },
  { i: 'clean_sheets',        x: 6, y: 69,  w: 6,  h: 15 },
  { i: 'streaks',             x: 0, y: 84,  w: 12, h: 10 },
  { i: 'elo',                 x: 0, y: 94,  w: 6,  h: 20 },
  { i: 'form_table',          x: 6, y: 94,  w: 6,  h: 14 },
  { i: 'title_relegation',    x: 0, y: 114, w: 7,  h: 16 },
  { i: 'points_pace',         x: 7, y: 114, w: 5,  h: 16 },
  { i: 'h2h_matrix',          x: 0, y: 130, w: 12, h: 20 },
  { i: 'scoreline_stats',     x: 0, y: 150, w: 6,  h: 18 },
]

const WIDGET_LABELS: Record<WidgetId, string> = {
  round_summary:       'Podsumowanie rundy',
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
  round_summary: '📰', standings: '🏆', pythagorean: '📐', form: '📈',
  results: '📅', league_stats: '📊', home_away: '🏟️', goals_trend: '📉',
  clean_sheets: '🛡️', streaks: '🔥', schedule: '🗓️',
  elo: '⚡', form_table: '🔥', h2h_matrix: '⚔️',
  scoreline_stats: '🎯', title_relegation: '🏁', points_pace: '📈',
  positions_over_time: '📉',
}

const STORAGE_KEY = 'bytom-dashboard-layout-v4'
const HIDDEN_KEY  = 'bytom-dashboard-hidden-v4'

// Mobile widget order (most important first)
const MOBILE_WIDGET_ORDER: WidgetId[] = [
  'round_summary', 'standings', 'results', 'form', 'positions_over_time',
  'form_table', 'elo', 'title_relegation', 'points_pace',
  'pythagorean', 'home_away', 'goals_trend', 'clean_sheets',
  'streaks', 'h2h_matrix', 'scoreline_stats', 'league_stats',
]

function loadLayout(): Layout[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') ?? DEFAULT_LAYOUT }
  catch { return DEFAULT_LAYOUT }
}
function loadHidden(): Set<WidgetId> {
  try { return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]')) }
  catch { return new Set() }
}

export function Dashboard({ data, onRefresh, isRefreshing }: Props) {
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

  const handleLayoutChange = (l: Layout[]) => {
    setLayout(l)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(l))
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
      case 'standings':    return <StandingsWidget teams={teams} />
      case 'pythagorean':  return <PythagoreanWidget teams={teams} />
      case 'form':         return <FormWidget teams={teams} />
      case 'results':      return <ResultsWidget results={data.results ?? []} />
      case 'league_stats': return data.league ? <LeagueStatsWidget stats={data.league} /> : null
      case 'home_away':    return teams.length ? <HomeAwayWidget teams={teams} /> : null
      case 'goals_trend':  return teams.length ? <GoalTrendsWidget teams={teams} /> : null
      case 'clean_sheets': return <CleanSheetsWidget teams={teams} />
      case 'streaks':          return <StreaksWidget teams={teams} />
      case 'elo':              return data.elo?.length ? <EloWidget elo={data.elo} /> : null
      case 'form_table':       return data.form_table?.length ? <FormTableWidget formTable={data.form_table} /> : null
      case 'h2h_matrix':       return data.h2h_matrix?.teams.length ? <H2HMatrixWidget h2h={data.h2h_matrix} /> : null
      case 'scoreline_stats':  return data.scoreline_stats ? <ScorelineWidget stats={data.scoreline_stats} /> : null
      case 'title_relegation': return data.title_relegation?.length ? <TitleRelegationWidget data={data.title_relegation} /> : null
      case 'points_pace':         return data.title_relegation?.length ? <PointsPaceWidget data={data.title_relegation} /> : null
      case 'positions_over_time': return data.positions_over_time?.rounds.length ? <PositionsWidget data={data.positions_over_time} /> : null
      case 'round_summary':       return <RoundSummaryWidget initial={data.round_summary} />
      default: return null
    }
  }

  const lg = data.league
  const statBar = lg ? [
    { label: 'Mecze',        value: lg.total_matches,          color: 'text-white' },
    { label: 'Bramki',       value: lg.total_goals,             color: 'text-white' },
    { label: 'Śr. goli',     value: lg.avg_goals_per_match,     color: 'text-accent-yellow' },
    { label: 'BTTS',         value: `${lg.btts_pct}%`,          color: 'text-accent-cyan' },
    { label: 'Over 2.5',     value: `${lg.over_25_pct}%`,       color: 'text-accent-orange' },
    { label: 'Wygr. gosp.', value: `${lg.home_win_pct}%`,      color: 'text-accent-green' },
    { label: 'Remisy',       value: `${lg.draw_pct}%`,          color: 'text-accent-yellow' },
    { label: 'Wygr. gości', value: `${lg.away_win_pct}%`,      color: 'text-accent-red' },
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
            background: 'linear-gradient(180deg, #0a1628 0%, #0c1e32 100%)',
            borderBottom: '1px solid rgba(74,222,128,0.2)',
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
                color: '#4ade80', fontSize: '14px', fontWeight: 600,
                padding: '6px 10px', borderRadius: '8px',
                background: 'rgba(74,222,128,0.1)',
                border: '1px solid rgba(74,222,128,0.25)',
              }}
            >
              <ArrowLeft size={16} />
              Wróć
            </button>
            <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '15px' }}>
              {WIDGET_ICONS[mobileWidget]}&nbsp;{WIDGET_LABELS[mobileWidget]}
            </span>
          </header>

          <div style={{ padding: '12px' }}>
            {widget
              ? widget
              : <p style={{ color: '#94a3b8', textAlign: 'center', paddingTop: '3rem', fontSize: '14px' }}>
                  Brak danych dla tego widgetu
                </p>
            }
          </div>

          <footer style={{ textAlign: 'center', padding: '16px', fontSize: '11px', color: '#334155' }}>
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
          background: 'linear-gradient(180deg, #0a1628 0%, #0c1e32 100%)',
          borderBottom: '1px solid rgba(74,222,128,0.2)',
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
                background: 'linear-gradient(135deg, #16a34a, #4ade80)',
                boxShadow: '0 0 16px rgba(74,222,128,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>⚽</div>
              <div>
                <h1 style={{ color: '#f8fafc', fontWeight: 700, fontSize: '15px', letterSpacing: '0.05em', fontFamily: "'Oswald', sans-serif" }}>
                  B-KLASA BYTOM
                </h1>
                <p style={{ color: 'rgba(148,163,184,0.8)', fontSize: '11px' }}>
                  Sezon 2025/2026 · {teams.length} drużyn
                </p>
              </div>
            </div>
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              style={{
                background: 'linear-gradient(135deg, #16a34a, #4ade80)',
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
              borderTop: '1px solid rgba(45,74,99,0.5)',
              paddingTop: '8px',
            }}>
              {statBar.map(s => (
                <div key={s.label} className="shrink-0 flex items-center gap-1" style={{ fontSize: '11px' }}>
                  <span style={{ color: '#64748b' }}>{s.label}:</span>
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
                    ? 'linear-gradient(135deg, rgba(22,32,50,0.95), rgba(12,30,50,0.9))'
                    : 'rgba(15,23,42,0.5)',
                  border: `1px solid ${available ? 'rgba(74,222,128,0.2)' : 'rgba(45,74,99,0.25)'}`,
                  borderRadius: '14px',
                  padding: '16px 10px',
                  textAlign: 'center',
                  cursor: available ? 'pointer' : 'default',
                  opacity: available ? 1 : 0.45,
                  transition: 'transform 0.1s, box-shadow 0.1s',
                  boxShadow: available ? '0 2px 12px rgba(0,0,0,0.3)' : 'none',
                }}
                onTouchStart={e => available && ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.96)')}
                onTouchEnd={e => ((e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}
              >
                <div style={{ fontSize: '30px', marginBottom: '7px', lineHeight: 1 }}>
                  {WIDGET_ICONS[id]}
                </div>
                <div style={{
                  color: available ? '#e2e8f0' : '#475569',
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

        <footer style={{ textAlign: 'center', padding: '16px 16px 28px', fontSize: '11px', color: '#334155' }}>
          Dane: regionalnyfutbol.pl · 90minut.pl · Odświeżanie co 15 min
        </footer>
      </div>
    )
  }

  // ── DESKTOP VIEW ─────────────────────────────────────────────────────────
  const visibleLayout = layout.filter(l => !hidden.has(l.i as WidgetId))

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* ── Header ──────────────────────────────────────── */}
      <header className="sticky top-0 z-50 pitch-stripes" style={{
        background: 'linear-gradient(180deg, #0a1628 0%, #0c1e32 100%)',
        borderBottom: '1px solid rgba(74,222,128,0.2)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.5)',
      }}>
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">

          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-2xl"
                   style={{ background: 'linear-gradient(135deg, #16a34a, #4ade80)', boxShadow: '0 0 20px rgba(74,222,128,0.4)' }}>
                ⚽
              </div>
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight"
                  style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: '0.05em', color: '#f8fafc' }}>
                B-KLASA BYTOM
              </h1>
              <p className="text-xs" style={{ color: 'rgba(148,163,184,0.8)' }}>
                Sezon 2025/2026 · Śląski ZPN · {teams.length} drużyn
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button onClick={() => setPanel(!showPanel)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{ background: 'rgba(45,74,99,0.6)', border: '1px solid rgba(45,74,99,0.8)', color: '#94a3b8' }}>
              <Settings size={12} />
              Widgety
            </button>
            <button onClick={resetLayout}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{ background: 'rgba(45,74,99,0.6)', border: '1px solid rgba(45,74,99,0.8)', color: '#94a3b8' }}>
              <RotateCcw size={12} />
              Reset
            </button>
            <button onClick={onRefresh} disabled={isRefreshing}
              className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-semibold transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #16a34a, #4ade80)', color: '#0f172a', boxShadow: '0 0 15px rgba(74,222,128,0.3)' }}>
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Odświeżanie...' : 'Odśwież'}
            </button>
          </div>
        </div>

        {/* Widget toggle panel */}
        {showPanel && (
          <div className="max-w-[1600px] mx-auto px-4 pb-3 flex flex-wrap gap-1.5">
            {(Object.keys(WIDGET_LABELS) as WidgetId[]).filter(id => id !== 'schedule').map(id => (
              <button key={id} onClick={() => toggleWidget(id)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: hidden.has(id) ? 'rgba(30,45,61,0.4)' : 'rgba(74,222,128,0.1)',
                  border: `1px solid ${hidden.has(id) ? 'rgba(45,74,99,0.5)' : 'rgba(74,222,128,0.3)'}`,
                  color: hidden.has(id) ? '#475569' : '#4ade80',
                }}>
                {hidden.has(id) ? <EyeOff size={10} /> : <Eye size={10} />}
                {WIDGET_ICONS[id]} {WIDGET_LABELS[id]}
              </button>
            ))}
          </div>
        )}

        {/* Stats bar */}
        {statBar.length > 0 && (
          <div style={{ background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(45,74,99,0.5)' }}>
            <div className="max-w-[1600px] mx-auto px-4 py-2 flex gap-5 overflow-x-auto">
              {statBar.map(s => (
                <div key={s.label} className="flex items-center gap-1.5 shrink-0 text-xs">
                  <span style={{ color: '#64748b' }}>{s.label}:</span>
                  <span className={`font-bold ${s.color}`}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* ── Grid ────────────────────────────────────────── */}
      <div ref={containerRef} className="max-w-[1600px] mx-auto px-4 py-4">
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
      </div>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="text-center py-6 text-xs" style={{ color: '#334155' }}>
        Dane: regionalnyfutbol.pl · 90minut.pl · laczynaspilka.pl &nbsp;|&nbsp; Odśwież co 15 min
      </footer>
    </div>
  )
}
