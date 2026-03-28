import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from 'recharts'
import type { TitleRelegationEntry } from '../../types'

interface Props { data: TitleRelegationEntry[] }

export function PointsPaceWidget({ data }: Props) {
  if (!data.length) return null

  const sorted = [...data].sort((a, b) => b.projected - a.projected)
  const totalRounds = data[0]?.total_rounds ?? 30

  // B-klasa: top 2 promoted (green), 3–6 playoffs (blue), rest mid-table (slate)
  const color = (pos: number) => {
    if (pos === 1) return '#4ade80'
    if (pos <= 2) return '#86efac'
    if (pos <= 6) return '#60a5fa'
    return '#475569'
  }

  const short = (name: string) => name.split(' ').slice(-1)[0].slice(0, 8)

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <span className="text-accent-green">📈</span>
          <span className="font-semibold text-sm text-slate-200">Projekcja końcowa sezonu</span>
        </div>
        <span className="text-xs text-slate-500">PPG × {totalRounds} kolejek</span>
      </div>
      <div className="widget-body">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sorted} layout="vertical" margin={{ left: 0, right: 35, top: 4, bottom: 4 }}>
              <XAxis type="number" domain={[0, Math.ceil(sorted[0]?.projected ?? 90) + 5]}
                     tick={{ fontSize: 9, fill: '#64748b' }} />
              <YAxis type="category" dataKey="team" width={72}
                     tick={{ fontSize: 9, fill: '#94a3b8' }} tickFormatter={short} />
              <Tooltip
                contentStyle={{ background: '#1e2d3d', border: '1px solid #2d4a63', fontSize: 11 }}
                formatter={(v: number, _: string, props: any) => [
                  `${v} pkt (PPG: ${props.payload?.ppg})`,
                  'Projekcja'
                ]}
              />
              <ReferenceLine x={sorted[0]?.projected ?? 90} stroke="rgba(74,222,128,0.2)" strokeDasharray="4 4" />
              <Bar dataKey="projected" radius={[0, 3, 3, 0]} label={{ position: 'right', fontSize: 9, fill: '#94a3b8' }}>
                {sorted.map(row => (
                  <Cell key={row.team} fill={color(row.position)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex gap-4 justify-center mt-2 text-xs text-slate-500">
          <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: '#4ade80' }} />Awans (1–2)</span>
          <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: '#60a5fa' }} />Baraże (3–6)</span>
          <span><span className="inline-block w-2 h-2 rounded-sm mr-1" style={{ background: '#475569' }} />Środek tabeli</span>
        </div>
      </div>
    </div>
  )
}
