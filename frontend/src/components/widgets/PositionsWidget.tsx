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

const TEAM_COLORS = [
  '#4ade80', '#60a5fa', '#f472b6', '#fbbf24', '#a78bfa',
  '#34d399', '#fb923c', '#38bdf8', '#e879f9', '#a3e635',
  '#f87171', '#22d3ee', '#c084fc', '#fdba74', '#86efac',
]

export function PositionsWidget({ data }: Props) {
  const { teams, rounds } = data
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set())
  const nTeams = teams.length

  const teamMeta = useMemo(() => {
    const sorted = [...teams].sort()
    return Object.fromEntries(
      sorted.map((t, i) => [t, { key: `t${i}`, color: TEAM_COLORS[i % TEAM_COLORS.length] }])
    )
  }, [teams])

  const chartData = useMemo(() =>
    rounds.map(r => {
      const point: Record<string, number> = { round: r.round }
      for (const [team, pos] of Object.entries(r.positions)) {
        if (teamMeta[team]) point[teamMeta[team].key] = nTeams + 1 - pos
      }
      return point
    }),
    [rounds, teamMeta, nTeams]
  )

  const yTicks = Array.from({ length: nTeams }, (_, i) => i + 1)
  const yFormatter = (v: number) => String(nTeams + 1 - v)

  const toggleTeam = (team: string) => {
    setHighlighted(prev => {
      const next = new Set(prev)
      next.has(team) ? next.delete(team) : next.add(team)
      return next
    })
  }

  const clearAll = () => setHighlighted(new Set())

  const anyHighlighted = highlighted.size > 0

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    // If teams are highlighted, only show those in tooltip
    const visible = anyHighlighted
      ? payload.filter((p: any) => highlighted.has(p.name))
      : [...payload].sort((a, b) => b.value - a.value)
    const sorted = [...visible].sort((a: any, b: any) => b.value - a.value)
    return (
      <div className="bg-pitch-800 border border-pitch-500 rounded-lg p-2 text-xs shadow-xl max-h-60 overflow-y-auto">
        <p className="text-slate-400 mb-1 font-semibold">Kolejka {label}</p>
        {sorted.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color }} className="flex justify-between gap-3">
            <span className="truncate max-w-[140px]">{p.name}</span>
            <span className="font-bold">#{nTeams + 1 - p.value}</span>
          </p>
        ))}
      </div>
    )
  }

  const promoLine = nTeams - 2 + 0.5
  const playoffLine = nTeams - 3 + 0.5

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-accent-green" />
          <span className="font-semibold text-sm text-slate-200">Pozycje w tabeli</span>
        </div>
        <div className="flex items-center gap-2">
          {anyHighlighted && (
            <button className="no-drag text-xs text-slate-400 hover:text-white transition-colors" onClick={clearAll}>
              Wyczyść ({highlighted.size})
            </button>
          )}
          <span className="text-xs text-slate-500">{rounds.length} kolejek</span>
        </div>
      </div>
      <div className="widget-body">
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer width="100%" height="100%" debounce={50}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#162340" />
              <XAxis dataKey="round" tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <YAxis
                domain={[1, nTeams]}
                ticks={yTicks}
                tickFormatter={yFormatter}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                width={22}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine y={promoLine} stroke="#4ade80" strokeDasharray="4 2" strokeOpacity={0.5} />
              <ReferenceLine y={playoffLine} stroke="#60a5fa" strokeDasharray="4 2" strokeOpacity={0.5} />
              {teams.map(team => {
                const meta = teamMeta[team]
                if (!meta) return null
                const isHighlighted = highlighted.has(team)
                return (
                  <Line
                    key={meta.key}
                    type="monotone"
                    dataKey={meta.key}
                    name={team}
                    stroke={meta.color}
                    strokeWidth={isHighlighted ? 3 : anyHighlighted ? 0.5 : 1.5}
                    strokeOpacity={anyHighlighted && !isHighlighted ? 0.1 : 1}
                    dot={false}
                    activeDot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                )
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          {[...teams].sort().map(team => {
            const meta = teamMeta[team]
            const isHighlighted = highlighted.has(team)
            return (
              <button
                key={team}
                className="no-drag flex items-center gap-1 text-xs transition-opacity"
                style={{ opacity: anyHighlighted && !isHighlighted ? 0.3 : 1 }}
                onClick={() => toggleTeam(team)}
              >
                <span
                  className="w-3 h-0.5 rounded-full inline-block"
                  style={{
                    backgroundColor: meta?.color,
                    height: isHighlighted ? '3px' : '2px',
                    boxShadow: isHighlighted ? `0 0 4px ${meta?.color}` : 'none',
                  }}
                />
                <span className={`hover:text-white truncate max-w-[120px] ${isHighlighted ? 'text-white font-medium' : 'text-slate-300'}`}>
                  {team}
                </span>
              </button>
            )
          })}
        </div>
        <p className="text-xs text-slate-600 mt-1">Kliknij drużynę aby wyróżnić (multi) · — awans · — baraże</p>
      </div>
    </div>
  )
}
