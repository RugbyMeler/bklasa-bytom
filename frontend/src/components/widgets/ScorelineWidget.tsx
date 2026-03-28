import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import type { ScorelineStats } from '../../types'

interface Props { stats: ScorelineStats }

// Determine match type: home win, draw, away win
const resultType = (score: string) => {
  const [h, a] = score.split('-').map(Number)
  if (h > a) return 'home'
  if (h < a) return 'away'
  return 'draw'
}

const typeColor: Record<string, string> = {
  home: '#4ade80',
  draw: '#fbbf24',
  away: '#f87171',
}

export function ScorelineWidget({ stats }: Props) {
  const { most_common, avg_margin, avg_total_goals, zero_zero, one_nil, total_matches } = stats

  const summary = [
    { label: 'Śr. goli/mecz', value: avg_total_goals, color: '#4ade80' },
    { label: 'Śr. różnica', value: avg_margin, color: '#fbbf24' },
    { label: '0-0', value: zero_zero, color: '#94a3b8' },
    { label: '1-0 / 0-1', value: one_nil, color: '#86efac' },
  ]

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <span className="text-accent-green">🎯</span>
          <span className="font-semibold text-sm text-slate-200">Wyniki meczy</span>
        </div>
        <span className="text-xs text-slate-500">top wyniki · {total_matches} meczy</span>
      </div>
      <div className="widget-body">

        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {summary.map(s => (
            <div key={s.label} className="text-center p-2 rounded"
                 style={{ background: 'rgba(45,74,99,0.4)', border: '1px solid rgba(45,74,99,0.6)' }}>
              <div className="text-lg font-bold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Scoreline bar chart */}
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={most_common} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
              <XAxis type="number" tick={{ fontSize: 9, fill: '#64748b' }} />
              <YAxis type="category" dataKey="score" width={36}
                     tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'monospace' }} />
              <Tooltip
                contentStyle={{ background: '#1e2d3d', border: '1px solid #2d4a63', fontSize: 11 }}
                formatter={(v: number) => [v, 'Mecze']}
              />
              <Bar dataKey="count" radius={[0, 3, 3, 0]}>
                {most_common.map(({ score }) => (
                  <Cell key={score} fill={typeColor[resultType(score)]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex gap-4 justify-center mt-2 text-xs text-slate-500">
          <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: '#4ade80' }} />Gosp.</span>
          <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: '#fbbf24' }} />Remis</span>
          <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: '#f87171' }} />Goście</span>
        </div>
      </div>
    </div>
  )
}
