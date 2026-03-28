import { TrendingUp } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { useState, useMemo } from 'react'
import type { PositionsOverTime } from '../../types'

interface Props {
  data: PositionsOverTime
}

// Distinct colours for up to 15 teams
const TEAM_COLORS = [
  '#4ade80', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa',
  '#34d399', '#fb923c', '#38bdf8', '#e879f9', '#a3e635',
  '#f87171', '#22d3ee', '#c084fc', '#fdba74', '#86efac',
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const sorted = [...payload].sort((a, b) => a.value - b.value)
  return (
    <div className="bg-pitch-800 border border-pitch-500 rounded-lg p-2 text-xs shadow-xl max-h-60 overflow-y-auto">
      <p className="text-slate-400 mb-1 font-semibold">Kolejka {label}</p>
      {sorted.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="flex justify-between gap-3">
          <span className="truncate max-w-[130px]">{p.name}</span>
          <span className="font-bold">#{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export function PositionsWidget({ data }: Props) {
  const { teams, rounds } = data
  const [highlighted, setHighlighted] = useState<string | null>(null)

  // Build flat chart data: [{round, TeamA: pos, TeamB: pos, ...}]
  const chartData = useMemo(() =>
    rounds.map(r => ({
      round: r.round,
      ...r.positions,
    })),
    [rounds]
  )

  const colorMap = useMemo(() => {
    const sorted = [...teams].sort()
    return Object.fromEntries(sorted.map((t, i) => [t, TEAM_COLORS[i % TEAM_COLORS.length]]))
  }, [teams])

  const nTeams = teams.length

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-accent-green" />
          <span className="font-semibold text-sm text-slate-200">Pozycje w tabeli</span>
        </div>
        <span className="text-xs text-slate-500">{rounds.length} kolejek</span>
      </div>
      <div className="widget-body">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#162340" />
            <XAxis
              dataKey="round"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              label={{ value: 'Kolejka', position: 'insideBottomRight', offset: -4, fill: '#64748b', fontSize: 10 }}
            />
            <YAxis
              reversed
              domain={[1, nTeams]}
              ticks={Array.from({ length: nTeams }, (_, i) => i + 1)}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              width={20}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Zone reference lines */}
            <ReferenceLine y={2.5} stroke="#4ade80" strokeDasharray="4 2" strokeOpacity={0.4} />
            <ReferenceLine y={6.5} stroke="#60a5fa" strokeDasharray="4 2" strokeOpacity={0.4} />
            {teams.map(team => (
              <Line
                key={team}
                type="monotone"
                dataKey={team}
                name={team}
                stroke={colorMap[team]}
                strokeWidth={highlighted === team ? 2.5 : highlighted ? 0.5 : 1.5}
                strokeOpacity={highlighted && highlighted !== team ? 0.2 : 1}
                dot={false}
                activeDot={{ r: 3 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>

        {/* Team legend — click to highlight */}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {[...teams].sort().map(team => (
            <button
              key={team}
              className="no-drag flex items-center gap-1 text-xs transition-opacity"
              style={{ opacity: highlighted && highlighted !== team ? 0.35 : 1 }}
              onClick={() => setHighlighted(h => h === team ? null : team)}
            >
              <span className="w-3 h-0.5 rounded-full inline-block" style={{ backgroundColor: colorMap[team] }} />
              <span className="text-slate-300 hover:text-white truncate max-w-[120px]">{team}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-600 mt-1">Kliknij drużynę aby wyróżnić</p>
      </div>
    </div>
  )
}
