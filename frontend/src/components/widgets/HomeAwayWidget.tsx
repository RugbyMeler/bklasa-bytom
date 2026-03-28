import { Home, Plane } from 'lucide-react'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Tooltip, Legend,
} from 'recharts'
import type { AdvancedTeamStats } from '../../types'
import { useState } from 'react'

interface Props {
  teams: AdvancedTeamStats[]
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-pitch-800 border border-pitch-500 rounded p-2 text-xs shadow-xl">
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  )
}

export function HomeAwayWidget({ teams }: Props) {
  const [selectedTeam, setSelectedTeam] = useState<string>(teams[0]?.name ?? '')

  const team = teams.find(t => t.name === selectedTeam)

  const radarData = team
    ? [
        { subject: 'Zwycięstwa', home: team.home?.won ?? 0, away: team.away?.won ?? 0 },
        { subject: 'Bramki str.', home: team.home?.gf ?? 0, away: team.away?.gf ?? 0 },
        { subject: 'Czyste konto', home: team.clean_sheets ?? 0, away: 0 },
        { subject: 'PPG', home: (team.home?.ppg ?? 0) * 10, away: (team.away?.ppg ?? 0) * 10 },
        { subject: 'Punkty', home: team.home?.points ?? 0, away: team.away?.points ?? 0 },
      ]
    : []

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Home size={14} className="text-accent-blue" />
          <span className="font-semibold text-sm text-slate-200">Dom vs Wyjazd</span>
        </div>
        <select
          className="text-xs bg-pitch-600 border border-pitch-500 rounded px-2 py-1 text-slate-200 max-w-[160px]"
          value={selectedTeam}
          onChange={e => setSelectedTeam(e.target.value)}
        >
          {teams.map(t => (
            <option key={t.name} value={t.name}>{t.name}</option>
          ))}
        </select>
      </div>
      <div className="widget-body">
        {team && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* Home */}
              <div className="bg-pitch-600/40 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Home size={12} className="text-accent-blue" />
                  <span className="text-xs font-semibold text-accent-blue">DOM</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">M/Z/R/P</span>
                    <span className="text-white font-mono">
                      {team.home?.played}/{team.home?.won}/{team.home?.drawn}/{team.home?.lost}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bramki</span>
                    <span className="text-white">{team.home?.gf}:{team.home?.ga}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Punkty</span>
                    <span className="text-white font-bold">{team.home?.points}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">PPG</span>
                    <span className="text-green-400">{team.home?.ppg?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Śr. bramki</span>
                    <span className="text-slate-200">{team.home?.gf_per_game?.toFixed(1)}:{team.home?.ga_per_game?.toFixed(1)}</span>
                  </div>
                </div>
              </div>
              {/* Away */}
              <div className="bg-pitch-600/40 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <Plane size={12} className="text-accent-orange" />
                  <span className="text-xs font-semibold text-accent-orange">WYJAZD</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">M/Z/R/P</span>
                    <span className="text-white font-mono">
                      {team.away?.played}/{team.away?.won}/{team.away?.drawn}/{team.away?.lost}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bramki</span>
                    <span className="text-white">{team.away?.gf}:{team.away?.ga}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Punkty</span>
                    <span className="text-white font-bold">{team.away?.points}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">PPG</span>
                    <span className="text-orange-400">{team.away?.ppg?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Śr. bramki</span>
                    <span className="text-slate-200">{team.away?.gf_per_game?.toFixed(1)}:{team.away?.ga_per_game?.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>

            {radarData.length > 0 && (
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={radarData} margin={{ top: 0, right: 20, bottom: 0, left: 20 }}>
                  <PolarGrid stroke="#162340" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Radar name="Dom" dataKey="home" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
                  <Radar name="Wyjazd" dataKey="away" stroke="#f97316" fill="#f97316" fillOpacity={0.25} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                    formatter={(value) => value === 'Dom' ? '🏠 Dom' : '✈️ Wyjazd'}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </>
        )}
      </div>
    </div>
  )
}
