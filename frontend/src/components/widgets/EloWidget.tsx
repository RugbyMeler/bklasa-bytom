import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import type { EloEntry } from '../../types'

interface Props { elo: EloEntry[] }

export function EloWidget({ elo }: Props) {
  if (!elo.length) return null

  const avg = 1000
  const max = Math.max(...elo.map(e => e.elo))
  const min = Math.min(...elo.map(e => e.elo))

  const color = (e: number) =>
    e >= avg + 80 ? '#4ade80' : e >= avg ? '#86efac' : e >= avg - 80 ? '#fbbf24' : '#f87171'

  const short = (name: string) => name.split(' ').slice(-1)[0].slice(0, 9)

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <span className="text-accent-green">⚡</span>
          <span className="font-semibold text-sm text-slate-200">Ranking Elo</span>
        </div>
        <span className="text-xs text-slate-500">bazowe 1000 · K=32</span>
      </div>
      <div className="widget-body">
        <div className="h-44 mb-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={elo} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
              <XAxis type="number" domain={[min - 20, max + 20]} tick={{ fontSize: 9, fill: '#64748b' }} />
              <YAxis type="category" dataKey="team" width={80} tick={{ fontSize: 9, fill: '#94a3b8' }}
                tickFormatter={short} />
              <Tooltip
                contentStyle={{ background: '#1e2d3d', border: '1px solid #2d4a63', fontSize: 11 }}
                formatter={(v: number) => [v, 'Elo']}
              />
              <ReferenceLine x={1000} stroke="rgba(100,116,139,0.4)" strokeDasharray="3 3" />
              <Bar dataKey="elo" radius={[0, 3, 3, 0]}>
                {elo.map(e => <Cell key={e.team} fill={color(e.elo)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-pitch-500 text-slate-400">
              <th className="px-2 py-1 text-center w-6">#</th>
              <th className="px-2 py-1 text-left">Drużyna</th>
              <th className="px-2 py-1 text-right">Elo</th>
              <th className="px-2 py-1 text-right">vs avg</th>
            </tr>
          </thead>
          <tbody>
            {elo.map(e => (
              <tr key={e.team} className="border-b border-pitch-600 hover:bg-pitch-600/30">
                <td className="px-2 py-1 text-center text-slate-500">{e.rank}</td>
                <td className="px-2 py-1 text-slate-200">{e.team}</td>
                <td className="px-2 py-1 text-right font-bold" style={{ color: color(e.elo) }}>{e.elo}</td>
                <td className="px-2 py-1 text-right text-xs" style={{ color: e.elo >= avg ? '#4ade80' : '#f87171' }}>
                  {e.elo >= avg ? '+' : ''}{(e.elo - avg).toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
