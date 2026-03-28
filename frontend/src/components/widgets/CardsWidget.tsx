import { AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts'
import type { CardEntry } from '../../types'

interface Props {
  cards: CardEntry[]
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-pitch-800 border border-pitch-500 rounded p-2 text-xs shadow-xl">
      <p className="font-semibold text-white mb-1">{payload[0]?.payload?.name}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.fill }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export function CardsWidget({ cards }: Props) {
  const top = cards.slice(0, 20)
  const chartData = top.map(c => ({
    name: c.name.split(' ').slice(-1)[0], // surname only
    fullName: c.name,
    yellow: c.yellow_cards,
    red: c.red_cards,
  }))

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-accent-yellow" />
          <span className="font-semibold text-sm text-slate-200">Kartki</span>
        </div>
        <span className="text-xs text-slate-500">{cards.length} zawodników</span>
      </div>
      <div className="widget-body">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 40, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#162340" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.05)' }} />
            <Bar dataKey="yellow" name="Żółte" fill="#eab308" stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="red" name="Czerwone" fill="#ef4444" stackId="a" radius={[3, 3, 0, 0]} />
            <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8', paddingTop: '8px' }} />
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-pitch-500 text-slate-400">
                <th className="text-left py-1.5 px-2">#</th>
                <th className="text-left py-1.5 px-2">Zawodnik</th>
                <th className="text-center py-1.5 px-2">
                  <span className="inline-block w-4 h-5 bg-yellow-400 rounded-sm text-black font-bold text-xs leading-5 text-center">Ż</span>
                </th>
                <th className="text-center py-1.5 px-2">
                  <span className="inline-block w-4 h-5 bg-red-500 rounded-sm text-white font-bold text-xs leading-5 text-center">C</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {top.map((c, i) => (
                <tr key={`${c.name}-${i}`} className="border-b border-pitch-600 hover:bg-pitch-600/30">
                  <td className="py-1.5 px-2 text-slate-500">{i + 1}</td>
                  <td className="py-1.5 px-2 text-slate-200">{c.name}</td>
                  <td className="py-1.5 px-2 text-center">
                    <span className="inline-flex items-center justify-center w-5 h-6 bg-yellow-400 rounded-sm text-black font-bold text-xs">
                      {c.yellow_cards}
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-center">
                    {c.red_cards > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-6 bg-red-500 rounded-sm text-white font-bold text-xs">
                        {c.red_cards}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
