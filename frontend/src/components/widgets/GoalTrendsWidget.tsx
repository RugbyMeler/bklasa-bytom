import { Activity } from 'lucide-react'
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { useState, useMemo } from 'react'
import type { AdvancedTeamStats, GoalTrendEntry } from '../../types'

interface Props {
  teams: AdvancedTeamStats[]
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-pitch-800 border border-pitch-500 rounded-lg p-2 text-xs shadow-xl">
      <p className="text-slate-400 mb-1">Kolejka {label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

function buildChartData(team: AdvancedTeamStats | undefined) {
  if (!team?.goals_trend?.length) return []
  let cumGf = 0, cumGa = 0
  return team.goals_trend.map((entry: GoalTrendEntry, i: number) => {
    cumGf += entry.gf
    cumGa += entry.ga
    return {
      round: entry.round ?? i + 1,
      gf: entry.gf,
      ga: entry.ga,
      cumGf,
      cumGa,
      venue: entry.venue,
    }
  })
}

// Merge two teams' trend data by round for comparison
function mergeForComparison(
  data1: ReturnType<typeof buildChartData>,
  data2: ReturnType<typeof buildChartData>,
  name1: string,
  name2: string,
) {
  const roundMap: Record<number, any> = {}
  data1.forEach(d => {
    roundMap[d.round] = { round: d.round, [`${name1}_gf`]: d.gf, [`${name1}_ga`]: d.ga }
  })
  data2.forEach(d => {
    if (!roundMap[d.round]) roundMap[d.round] = { round: d.round }
    roundMap[d.round][`${name2}_gf`] = d.gf
    roundMap[d.round][`${name2}_ga`] = d.ga
  })
  return Object.values(roundMap).sort((a, b) => a.round - b.round)
}

export function GoalTrendsWidget({ teams }: Props) {
  const [selectedTeam, setSelectedTeam] = useState<string>(teams[0]?.name ?? '')
  const [mode, setMode] = useState<'single' | 'compare'>('single')
  const [compareTeam, setCompareTeam] = useState<string>(teams[1]?.name ?? '')
  const [view, setView] = useState<'per_match' | 'cumulative'>('per_match')

  const team1 = teams.find(t => t.name === selectedTeam)
  const team2 = teams.find(t => t.name === compareTeam)

  const data1 = useMemo(() => buildChartData(team1), [team1])
  const data2 = useMemo(() => buildChartData(team2), [team2])

  const singleChartData = view === 'per_match'
    ? data1.map(d => ({ round: d.round, Strzelone: d.gf, Stracone: d.ga }))
    : data1.map(d => ({ round: d.round, 'Kum. str.': d.cumGf, 'Kum. strac.': d.cumGa }))

  const t1short = selectedTeam.split(' ')[0]
  const t2short = compareTeam.split(' ')[0]
  const compareChartData = useMemo(
    () => mergeForComparison(data1, data2, t1short, t2short),
    [data1, data2, t1short, t2short]
  )

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-accent-cyan" />
          <span className="font-semibold text-sm text-slate-200">Trendy bramkowe</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setMode('single')}
            className={`text-xs px-2 py-1 rounded transition-colors ${mode === 'single' ? 'bg-accent-blue text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Jedna drużyna
          </button>
          <button
            onClick={() => setMode('compare')}
            className={`text-xs px-2 py-1 rounded transition-colors ${mode === 'compare' ? 'bg-accent-purple text-white' : 'text-slate-400 hover:text-white'}`}
          >
            Porównaj
          </button>
        </div>
      </div>
      <div className="widget-body">
        {/* Team selectors */}
        <div className="flex gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-1">
            <span className="w-2.5 h-2.5 rounded-full bg-green-400 shrink-0" />
            <select
              className="text-xs bg-pitch-700 border border-pitch-500 rounded px-2 py-1 text-slate-200 flex-1 min-w-0 appearance-none cursor-pointer"
              value={selectedTeam}
              onChange={e => setSelectedTeam(e.target.value)}
            >
              {teams.map(t => <option key={t.name} value={t.name} style={{ backgroundColor: '#162032', color: '#e2e8f0' }}>{t.name}</option>)}
            </select>
          </div>
          {mode === 'compare' && (
            <div className="flex items-center gap-1.5 flex-1">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shrink-0" />
              <select
                className="text-xs bg-pitch-700 border border-pitch-500 rounded px-2 py-1 text-slate-200 flex-1 min-w-0 appearance-none cursor-pointer"
                value={compareTeam}
                onChange={e => setCompareTeam(e.target.value)}
              >
                {teams.map(t => <option key={t.name} value={t.name} style={{ backgroundColor: '#162032', color: '#e2e8f0' }}>{t.name}</option>)}
              </select>
            </div>
          )}
          {mode === 'single' && (
            <div className="flex gap-1">
              <button
                onClick={() => setView('per_match')}
                className={`text-xs px-2 py-1 rounded ${view === 'per_match' ? 'bg-pitch-500 text-white' : 'text-slate-500'}`}
              >
                Mecz
              </button>
              <button
                onClick={() => setView('cumulative')}
                className={`text-xs px-2 py-1 rounded ${view === 'cumulative' ? 'bg-pitch-500 text-white' : 'text-slate-500'}`}
              >
                Suma
              </button>
            </div>
          )}
        </div>

        {mode === 'single' ? (
          <>
            {view === 'per_match' && (
              <>
                {/* Summary stats bar */}
                {team1 && (
                  <div className="flex gap-4 mb-3 text-xs">
                    <span className="text-slate-400">Śr. strzelone: <strong className="text-green-400">{team1.gf_per_game?.toFixed(1)}</strong></span>
                    <span className="text-slate-400">Śr. stracone: <strong className="text-red-400">{team1.ga_per_game?.toFixed(1)}</strong></span>
                    <span className="text-slate-400">CK: <strong className="text-blue-400">{team1.clean_sheets}</strong></span>
                    <span className="text-slate-400">NS: <strong className="text-orange-400">{team1.failed_to_score}</strong></span>
                  </div>
                )}
                <ResponsiveContainer width="100%" height={200}>
                  <ComposedChart data={singleChartData} margin={{ top: 4, right: 4, bottom: 4, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#162340" />
                    <XAxis dataKey="round" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Strzelone" fill="#22c55e" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                    <Bar dataKey="Stracone" fill="#ef4444" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                    <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </>
            )}
            {view === 'cumulative' && (
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={data1.map(d => ({ round: d.round, 'Kum. str.': d.cumGf, 'Kum. strac.': d.cumGa }))} margin={{ top: 4, right: 4, bottom: 4, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#162340" />
                  <XAxis dataKey="round" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="Kum. str." stroke="#22c55e" dot={false} strokeWidth={2.5} />
                  <Line type="monotone" dataKey="Kum. strac." stroke="#ef4444" dot={false} strokeWidth={2.5} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </>
        ) : (
          /* COMPARISON MODE — both teams on same chart */
          <>
            <div className="flex gap-4 mb-2 text-xs">
              {team1 && (
                <span className="text-green-400">{t1short}: śr. {team1.gf_per_game?.toFixed(1)} str / {team1.ga_per_game?.toFixed(1)} strac</span>
              )}
              {team2 && (
                <span className="text-purple-400">{t2short}: śr. {team2.gf_per_game?.toFixed(1)} str / {team2.ga_per_game?.toFixed(1)} strac</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-2">Bramki strzelone per mecz (słupki) i stracone (linie)</p>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={compareChartData} margin={{ top: 4, right: 4, bottom: 4, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#162340" />
                <XAxis dataKey="round" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                {/* Team 1 */}
                <Bar dataKey={`${t1short}_gf`} name={`${t1short} str.`} fill="#22c55e" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                <Line type="monotone" dataKey={`${t1short}_ga`} name={`${t1short} strac.`} stroke="#22c55e" strokeDasharray="4 2" dot={false} strokeWidth={1.5} />
                {/* Team 2 */}
                <Bar dataKey={`${t2short}_gf`} name={`${t2short} str.`} fill="#a855f7" fillOpacity={0.7} radius={[2, 2, 0, 0]} />
                <Line type="monotone" dataKey={`${t2short}_ga`} name={`${t2short} strac.`} stroke="#a855f7" strokeDasharray="4 2" dot={false} strokeWidth={1.5} />
                <Legend wrapperStyle={{ fontSize: '10px', color: '#94a3b8' }} />
              </ComposedChart>
            </ResponsiveContainer>

            {/* PPG comparison */}
            {team1 && team2 && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                {[team1, team2].map((t, i) => (
                  <div key={t.name} className={`rounded-lg p-2 text-xs ${i === 0 ? 'bg-green-500/10 border border-green-500/20' : 'bg-purple-500/10 border border-purple-500/20'}`}>
                    <p className={`font-semibold mb-1 ${i === 0 ? 'text-green-400' : 'text-purple-400'}`}>{t.name}</p>
                    <div className="space-y-0.5 text-slate-300">
                      <div className="flex justify-between"><span>Pkt</span><span className="font-bold text-white">{t.points}</span></div>
                      <div className="flex justify-between"><span>PPG</span><span>{t.ppg?.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>GF:GA</span><span>{t.goals_for}:{t.goals_against}</span></div>
                      <div className="flex justify-between"><span>Pyth</span><span>{(t.pythagorean_expectation * 100).toFixed(1)}%</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
