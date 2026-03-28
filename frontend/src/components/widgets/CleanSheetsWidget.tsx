import { Shield } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import type { AdvancedTeamStats } from '../../types'

interface Props {
  teams: AdvancedTeamStats[]
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-pitch-800 border border-pitch-500 rounded-lg p-2 text-xs shadow-xl">
      <p className="font-semibold text-white mb-1">{d.fullName}</p>
      <p className="text-slate-300">Czyste konta: <span className="text-accent-blue font-bold">{d.clean_sheets}</span></p>
      <p className="text-slate-300">Nie strzelił: <span className="text-red-400 font-bold">{d.failed_to_score}</span></p>
      <p className="text-slate-300">BTTS: <span className="text-yellow-400 font-bold">{d.btts}</span></p>
      <p className="text-slate-300">Over 2.5: <span className="text-orange-400 font-bold">{d.over_2_5}</span></p>
      <p className="text-slate-300">% konsekwencja strzelecka: <span className="text-green-400">{d.scoring_consistency}%</span></p>
    </div>
  )
}

export function CleanSheetsWidget({ teams }: Props) {
  const data = [...teams]
    .sort((a, b) => (b.clean_sheets ?? 0) - (a.clean_sheets ?? 0))
    .map(t => ({
      name: t.name.split(' ')[0],
      fullName: t.name,
      clean_sheets: t.clean_sheets ?? 0,
      failed_to_score: t.failed_to_score ?? 0,
      btts: t.btts ?? 0,
      over_2_5: t.over_2_5 ?? 0,
      scoring_consistency: t.scoring_consistency ?? 0,
    }))

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-accent-blue" />
          <span className="font-semibold text-sm text-slate-200">Defensywa i skuteczność</span>
        </div>
      </div>
      <div className="widget-body">
        <p className="text-xs text-slate-500 mb-2">Czyste konta (hover = pełne statystyki)</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 40, left: -10 }}>
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
            <Bar dataKey="clean_sheets" radius={[3, 3, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.clean_sheets >= 5 ? '#22c55e' : entry.clean_sheets >= 3 ? '#3b82f6' : '#64748b'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-pitch-500 text-slate-400">
                <th className="text-left py-1.5 px-2">Drużyna</th>
                <th className="text-center py-1.5 px-2 text-blue-400" title="Czyste konta">CK</th>
                <th className="text-center py-1.5 px-2 text-red-400" title="Nie strzelił">NS</th>
                <th className="text-center py-1.5 px-2 text-yellow-400" title="Oba strzelają">BTTS</th>
                <th className="text-center py-1.5 px-2 text-orange-400" title="Ponad 2.5 bramki">O2.5</th>
                <th className="text-center py-1.5 px-2 text-green-400" title="% meczów ze zdobytą bramką">Skt%</th>
              </tr>
            </thead>
            <tbody>
              {data.map(t => (
                <tr key={t.fullName} className="border-b border-pitch-600 hover:bg-pitch-600/30">
                  <td className="py-1.5 px-2 text-slate-200 truncate max-w-[120px]">{t.fullName}</td>
                  <td className="py-1.5 px-2 text-center text-blue-400 font-bold">{t.clean_sheets}</td>
                  <td className="py-1.5 px-2 text-center text-red-400">{t.failed_to_score}</td>
                  <td className="py-1.5 px-2 text-center text-yellow-400">{t.btts}</td>
                  <td className="py-1.5 px-2 text-center text-orange-400">{t.over_2_5}</td>
                  <td className="py-1.5 px-2 text-center text-green-400">{t.scoring_consistency}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
