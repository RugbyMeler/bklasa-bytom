import { useState, useMemo } from 'react'
import { CalendarDays, MapPin, Home, Plane } from 'lucide-react'
import type { MatchResult } from '../../types'

interface Props {
  schedule: MatchResult[]
  teams: string[]
}

const POLISH_DAYS = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb']
const POLISH_MONTHS = [
  'sty', 'lut', 'mar', 'kwi', 'maj', 'cze',
  'lip', 'sie', 'wrz', 'paź', 'lis', 'gru',
]

function formatDate(dateStr: string, timeStr?: string): { short: string; dayName: string; full: string } {
  if (!dateStr) return { short: '—', dayName: '', full: '' }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return { short: dateStr, dayName: '', full: '' }
  const day  = POLISH_DAYS[d.getDay()]
  const date = d.getDate()
  const mon  = POLISH_MONTHS[d.getMonth()]
  const time = timeStr || ''
  return {
    short:   `${date} ${mon}`,
    dayName: day,
    full:    time ? `${day}, ${date} ${mon} · ${time}` : `${day}, ${date} ${mon}`,
  }
}

function daysFromNow(dateStr: string): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - now.getTime()) / 86_400_000)
}

export function UpcomingMatchesWidget({ schedule, teams }: Props) {
  const [selectedTeam, setSelectedTeam] = useState<string>('all')

  // Sort by date, filter out past matches
  const upcoming = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return schedule
      .filter(m => {
        if (!m.date) return true // keep undated fixtures
        const d = new Date(m.date)
        return isNaN(d.getTime()) || d >= today
      })
      .sort((a, b) => {
        if (!a.date && !b.date) return 0
        if (!a.date) return 1
        if (!b.date) return -1
        return new Date(a.date).getTime() - new Date(b.date).getTime()
      })
  }, [schedule])

  const filtered = useMemo(() => {
    if (selectedTeam === 'all') return upcoming.slice(0, 30)
    return upcoming.filter(
      m => m.home_team === selectedTeam || m.away_team === selectedTeam
    )
  }, [upcoming, selectedTeam])

  const sortedTeams = useMemo(() => [...teams].sort((a, b) => a.localeCompare(b, 'pl')), [teams])

  return (
    <div className="widget-card h-full flex flex-col">
      {/* Header */}
      <div className="widget-header flex items-center justify-between px-4 py-3"
           style={{ borderBottom: '1px solid rgba(74,222,128,0.15)' }}>
        <div className="flex items-center gap-2">
          <CalendarDays size={15} style={{ color: '#4ade80' }} />
          <span className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
            Nadchodzące mecze
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.25)' }}>
            {filtered.length}
          </span>
        </div>
        <select
          value={selectedTeam}
          onChange={e => setSelectedTeam(e.target.value)}
          className="no-drag text-xs rounded-lg px-2 py-1.5 appearance-none cursor-pointer"
          style={{
            background: '#162032', color: '#e2e8f0',
            border: '1px solid rgba(45,74,99,0.8)',
            maxWidth: '180px',
          }}
        >
          <option value="all">Wszystkie drużyny</option>
          {sortedTeams.map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Match list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full"
               style={{ color: '#475569', fontSize: '13px' }}>
            Brak zaplanowanych meczów
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'rgba(30,42,58,0.8)' }}>
            {filtered.map((match, i) => {
              const isHome = match.home_team === selectedTeam
              const isAway = match.away_team === selectedTeam
              const { short, dayName, full } = formatDate(match.date, match.time)
              const days = daysFromNow(match.date)

              let daysLabel = ''
              let daysColor = '#64748b'
              if (days !== null) {
                if (days === 0)      { daysLabel = 'Dziś';   daysColor = '#4ade80' }
                else if (days === 1) { daysLabel = 'Jutro';  daysColor = '#fbbf24' }
                else if (days <= 7)  { daysLabel = `Za ${days} dni`; daysColor = '#fb923c' }
                else                 { daysLabel = `Za ${days} dni` }
              }

              const highlight = selectedTeam !== 'all' && (isHome || isAway)

              return (
                <div key={i}
                  className="px-4 py-3 flex items-center gap-3"
                  style={{
                    background: highlight ? 'rgba(74,222,128,0.04)' : 'transparent',
                    borderLeft: highlight
                      ? `3px solid ${isHome ? '#4ade80' : '#60a5fa'}`
                      : '3px solid transparent',
                  }}
                >
                  {/* Date block */}
                  <div className="text-center shrink-0" style={{ minWidth: 38 }}>
                    <div className="text-xs font-bold" style={{ color: '#e2e8f0' }}>{short || '—'}</div>
                    <div className="text-xs" style={{ color: '#475569' }}>{dayName}</div>
                  </div>

                  {/* Match info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Home/Away badge for selected team */}
                      {highlight && (
                        <span className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded shrink-0"
                          style={{
                            background: isHome ? 'rgba(74,222,128,0.12)' : 'rgba(96,165,250,0.12)',
                            color: isHome ? '#4ade80' : '#60a5fa',
                            border: `1px solid ${isHome ? 'rgba(74,222,128,0.25)' : 'rgba(96,165,250,0.25)'}`,
                          }}>
                          {isHome ? <Home size={9} /> : <Plane size={9} />}
                          {isHome ? 'Dom' : 'Wyjazd'}
                        </span>
                      )}
                      <span className="text-xs font-medium truncate" style={{ color: '#cbd5e1' }}>
                        {match.home_team}
                      </span>
                      <span className="text-xs shrink-0" style={{ color: '#475569' }}>vs</span>
                      <span className="text-xs font-medium truncate" style={{ color: '#cbd5e1' }}>
                        {match.away_team}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {match.time && (
                        <span className="text-xs" style={{ color: '#64748b' }}>
                          {full}
                        </span>
                      )}
                      {match.round && (
                        <span className="text-xs" style={{ color: '#334155' }}>
                          · kolejka {match.round}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Days badge */}
                  {daysLabel && (
                    <div className="text-xs shrink-0 font-medium" style={{ color: daysColor }}>
                      {daysLabel}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
