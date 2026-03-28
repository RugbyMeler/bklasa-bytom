import { TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import type { AdvancedTeamStats } from '../../types'

interface Props {
  teams: AdvancedTeamStats[]
}

function FormBadge({ result, score }: { result: 'W' | 'D' | 'L'; score?: string }) {
  const styles = {
    W: 'bg-green-500/20 text-green-400 border border-green-500/30',
    D: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    L: 'bg-red-500/20 text-red-400 border border-red-500/30',
  }
  return (
    <span
      className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold cursor-default ${styles[result]}`}
      title={score}
    >
      {result}
    </span>
  )
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-pitch-800 border border-pitch-500 rounded-lg p-2 text-xs shadow-xl">
      <p className="font-semibold text-white">{label}</p>
      <p className="text-slate-300">Pkt z ostatnich 5: <span className="text-accent-blue font-bold">{payload[0].value}</span></p>
    </div>
  )
}

export function FormWidget({ teams }: Props) {
  const sorted = [...teams].sort((a, b) => (b.form_points ?? 0) - (a.form_points ?? 0))

  const chartData = sorted.map(t => ({
    name: t.name.split(' ')[0],
    fullName: t.name,
    form_points: t.form_points ?? 0,
  }))

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-accent-green" />
          <span className="font-semibold text-sm text-slate-200">Forma (ostatnie 5 meczów)</span>
        </div>
      </div>
      <div className="widget-body">
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 40, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#162340" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 15]} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
            <Bar dataKey="form_points" radius={[3, 3, 0, 0]}>
              {chartData.map((entry, i) => {
                const pts = entry.form_points
                const color = pts >= 12 ? '#22c55e' : pts >= 7 ? '#3b82f6' : pts >= 4 ? '#eab308' : '#ef4444'
                return <Cell key={i} fill={color} />
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-2 space-y-1.5">
          {sorted.slice(0, 10).map(team => (
            <div key={team.name} className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-300 truncate min-w-0 flex-1">{team.name}</span>
              <div className="flex gap-0.5 shrink-0">
                {(team.form || []).map((r, i) => {
                  const matchIdx = (team.goals_trend?.length ?? 0) - (team.form?.length ?? 0) + i
                  const match = team.goals_trend?.[matchIdx]
                  const score = match
                    ? `${match.gf}–${match.ga}${match.opponent ? ` vs ${match.opponent}` : ''}`
                    : undefined
                  return <FormBadge key={i} result={r} score={score} />
                })}
              </div>
              <span className="text-xs font-bold text-white w-6 text-right shrink-0">
                {team.form_points ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
