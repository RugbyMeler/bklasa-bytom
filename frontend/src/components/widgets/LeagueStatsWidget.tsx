import { BarChart2 } from 'lucide-react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import type { LeagueStats } from '../../types'

interface Props {
  stats: LeagueStats
}

const StatCard = ({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string
}) => (
  <div className="bg-pitch-600/50 rounded-lg p-3 flex flex-col gap-0.5">
    <span className="text-xs text-slate-400">{label}</span>
    <span className={`text-xl font-bold ${color ?? 'text-white'}`}>{value}</span>
    {sub && <span className="text-xs text-slate-500">{sub}</span>}
  </div>
)

const COLORS = ['#22c55e', '#eab308', '#ef4444']

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-pitch-800 border border-pitch-500 rounded p-2 text-xs">
      <p className="text-white">{payload[0].name}: <span className="font-bold">{payload[0].value}%</span></p>
    </div>
  )
}

export function LeagueStatsWidget({ stats }: Props) {
  const pieData = [
    { name: 'Wygrana gosp.', value: stats.home_win_pct },
    { name: 'Remis', value: stats.draw_pct },
    { name: 'Wygrana gości', value: stats.away_win_pct },
  ]

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <BarChart2 size={16} className="text-accent-blue" />
          <span className="font-semibold text-sm text-slate-200">Statystyki ligi</span>
        </div>
      </div>
      <div className="widget-body">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <StatCard label="Łącznie meczów" value={stats.total_matches} />
          <StatCard label="Łącznie bramek" value={stats.total_goals} />
          <StatCard
            label="Śr. bramki / mecz"
            value={stats.avg_goals_per_match?.toFixed(2)}
            color="text-accent-yellow"
          />
          <StatCard
            label="BTTS %"
            value={`${stats.btts_pct}%`}
            sub="Oba strzelają"
            color="text-accent-cyan"
          />
          <StatCard
            label="Over 2.5 %"
            value={`${stats.over_25_pct}%`}
            color="text-accent-orange"
          />
          <StatCard
            label="Over 3.5 %"
            value={`${stats.over_35_pct}%`}
            color="text-accent-purple"
          />
        </div>

        <div className="flex items-center">
          <ResponsiveContainer width="50%" height={140}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={60}
                dataKey="value"
                strokeWidth={0}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-2 text-xs">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-sm" style={{ background: COLORS[i] }} />
                <span className="text-slate-300">{d.name}</span>
                <span className="font-bold text-white ml-auto">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {stats.highest_scoring_match && (
          <div className="mt-3 p-2 bg-pitch-600/30 rounded-lg text-xs">
            <p className="text-slate-400 mb-1">Najbardziej bramkowy mecz:</p>
            <p className="text-white font-semibold">
              {stats.highest_scoring_match.home_team}{' '}
              <span className="text-accent-yellow font-mono">
                {stats.highest_scoring_match.home_goals}:{stats.highest_scoring_match.away_goals}
              </span>{' '}
              {stats.highest_scoring_match.away_team}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
