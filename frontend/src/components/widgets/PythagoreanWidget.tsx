import { Sigma } from 'lucide-react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Label,
} from 'recharts'
import type { AdvancedTeamStats } from '../../types'

interface Props {
  teams: AdvancedTeamStats[]
}

const CustomDot = (props: any) => {
  const { cx, cy, payload } = props
  const diff = payload.points_above_expectation
  const color = diff > 2 ? '#22c55e' : diff < -2 ? '#ef4444' : '#3b82f6'
  return (
    <g>
      <circle cx={cx} cy={cy} r={6} fill={color} fillOpacity={0.8} stroke={color} strokeWidth={1} />
    </g>
  )
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const diff = d.points_above_expectation
  return (
    <div className="bg-pitch-800 border border-pitch-500 rounded-lg p-3 text-xs shadow-xl">
      <p className="font-semibold text-white mb-1">{d.name}</p>
      <p className="text-slate-300">Pkt faktyczne: <span className="text-white font-bold">{d.points}</span></p>
      <p className="text-slate-300">Pkt oczekiwane (Pyth): <span className="text-yellow-400 font-bold">{d.pythagorean_points}</span></p>
      <p className={`font-semibold mt-1 ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-slate-400'}`}>
        {diff > 0 ? '▲' : diff < 0 ? '▼' : '='} {Math.abs(diff)} pkt {diff > 0 ? 'powyżej' : diff < 0 ? 'poniżej' : 'zgodnie z'} oczekiwań
      </p>
      <p className="text-slate-400 mt-1">Bramki: {d.goals_for}:{d.goals_against}</p>
      <p className="text-slate-400">Oczekiwany win%: {(d.pythagorean_expectation * 100).toFixed(1)}%</p>
    </div>
  )
}

export function PythagoreanWidget({ teams }: Props) {
  const data = teams.map(t => ({
    ...t,
    x: t.pythagorean_points,
    y: t.points,
  }))

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Sigma size={16} className="text-accent-purple" />
          <span className="font-semibold text-sm text-slate-200">Oczekiwanie Pitagorejskie</span>
        </div>
        <span className="text-xs text-slate-500">Pkt faktyczne vs oczekiwane</span>
      </div>
      <div className="widget-body">
        <p className="text-xs text-slate-400 mb-3">
          Formuła: GF<sup>1.7</sup> / (GF<sup>1.7</sup> + GA<sup>1.7</sup>) — oś X = oczekiwane pkt, oś Y = faktyczne pkt.
          <span className="text-green-400 ml-1">Zielony</span> = przewyższa oczekiwania,{' '}
          <span className="text-red-400">czerwony</span> = poniżej oczekiwań.
        </p>
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#162340" />
            <XAxis
              dataKey="x"
              type="number"
              name="Oczekiwane pkt"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              domain={['auto', 'auto']}
            >
              <Label value="Oczekiwane punkty (Pitagoras)" offset={-10} position="insideBottom" fill="#64748b" fontSize={11} />
            </XAxis>
            <YAxis
              dataKey="y"
              type="number"
              name="Faktyczne pkt"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              domain={['auto', 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              stroke="#3b82f6"
              strokeDasharray="4 4"
              segment={[
                { x: 0, y: 0 },
                { x: Math.max(...data.map(d => d.x)) + 5, y: Math.max(...data.map(d => d.x)) + 5 },
              ]}
              opacity={0.4}
            />
            <Scatter data={data} shape={<CustomDot />} />
          </ScatterChart>
        </ResponsiveContainer>

        {/* Table */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-pitch-500 text-slate-400">
                <th className="text-left py-1.5 px-2">Drużyna</th>
                <th className="text-center py-1.5 px-2">Pkt</th>
                <th className="text-center py-1.5 px-2 text-yellow-400">Pkt Pyth</th>
                <th className="text-center py-1.5 px-2">Różnica</th>
                <th className="text-center py-1.5 px-2">Win%</th>
              </tr>
            </thead>
            <tbody>
              {[...teams]
                .sort((a, b) => b.points_above_expectation - a.points_above_expectation)
                .map(t => {
                  const diff = t.points_above_expectation
                  return (
                    <tr key={t.name} className="border-b border-pitch-600 hover:bg-pitch-600/30">
                      <td className="py-1.5 px-2 text-slate-200">{t.name}</td>
                      <td className="py-1.5 px-2 text-center font-bold text-white">{t.points}</td>
                      <td className="py-1.5 px-2 text-center text-yellow-400">{t.pythagorean_points}</td>
                      <td className={`py-1.5 px-2 text-center font-semibold ${diff > 0 ? 'text-green-400' : diff < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                        {diff > 0 ? '+' : ''}{diff}
                      </td>
                      <td className="py-1.5 px-2 text-center text-slate-300">
                        {(t.pythagorean_expectation * 100).toFixed(1)}%
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
