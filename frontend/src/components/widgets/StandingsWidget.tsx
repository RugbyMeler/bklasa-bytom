import { Trophy } from 'lucide-react'
import clsx from 'clsx'
import type { AdvancedTeamStats } from '../../types'

interface Props {
  teams: AdvancedTeamStats[]
}

function FormDots({ form, trend }: { form: ('W' | 'D' | 'L')[]; trend?: { gf: number; ga: number; opponent?: string }[] }) {
  const offset = (trend?.length ?? 0) - form.length
  return (
    <div className="flex gap-0.5">
      {form.map((r, i) => {
        const match = trend?.[offset + i]
        const title = match
          ? `${match.gf}–${match.ga}${match.opponent ? ` vs ${match.opponent}` : ''}`
          : undefined
        return (
          <span key={i} className={`form-badge ${r} cursor-default`} title={title}>
            {r}
          </span>
        )
      })}
    </div>
  )
}

export function StandingsWidget({ teams }: Props) {
  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-accent-yellow" />
          <span className="font-semibold text-sm text-slate-200">Tabela ligowa</span>
        </div>
        <span className="text-xs text-slate-500">{teams.length} drużyn</span>
      </div>
      <div className="widget-body p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-pitch-500 text-slate-400">
                <th className="text-left px-3 py-2 w-6">#</th>
                <th className="text-left px-3 py-2 min-w-[140px]">Drużyna</th>
                <th className="px-2 py-2 text-center w-8">M</th>
                <th className="px-2 py-2 text-center w-8">Z</th>
                <th className="px-2 py-2 text-center w-8">R</th>
                <th className="px-2 py-2 text-center w-8">P</th>
                <th className="px-2 py-2 text-center w-16">Bramki</th>
                <th className="px-2 py-2 text-center w-8">+/-</th>
                <th className="px-2 py-2 text-center w-10 font-bold text-slate-200">Pkt</th>
                <th className="px-2 py-2 text-center min-w-[90px]">Forma</th>
                <th className="px-2 py-2 text-center w-12">PPG</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team, idx) => {
                const isPromotion = idx < 2
                const isPlayoff = idx >= 2 && idx < 6
                return (
                  <tr
                    key={team.name}
                    className={clsx(
                      'border-b border-pitch-600 hover:bg-pitch-600/50 transition-colors',
                      isPromotion && 'border-l-2 border-l-accent-green',
                      isPlayoff && 'border-l-2 border-l-blue-400',
                    )}
                  >
                    <td className="px-3 py-2 text-slate-400">{team.position}</td>
                    <td className="px-3 py-2 font-medium text-slate-100 whitespace-nowrap">{team.name}</td>
                    <td className="px-2 py-2 text-center text-slate-300">{team.played}</td>
                    <td className="px-2 py-2 text-center text-green-400">{team.won}</td>
                    <td className="px-2 py-2 text-center text-yellow-400">{team.drawn}</td>
                    <td className="px-2 py-2 text-center text-red-400">{team.lost}</td>
                    <td className="px-2 py-2 text-center text-slate-300">
                      {team.goals_for}:{team.goals_against}
                    </td>
                    <td className={clsx(
                      'px-2 py-2 text-center font-mono',
                      team.goal_difference > 0 ? 'text-green-400' : team.goal_difference < 0 ? 'text-red-400' : 'text-slate-400'
                    )}>
                      {team.goal_difference > 0 ? '+' : ''}{team.goal_difference}
                    </td>
                    <td className="px-2 py-2 text-center font-bold text-white">{team.points}</td>
                    <td className="px-2 py-2">
                      <FormDots form={team.form || []} trend={team.goals_trend} />
                    </td>
                    <td className="px-2 py-2 text-center text-slate-300 font-mono">{team.ppg?.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex gap-4 px-3 py-2 text-xs text-slate-500 border-t border-pitch-600">
          <span className="flex items-center gap-1"><span className="w-2 h-3 bg-green-500 rounded-sm inline-block" />Awans (1–2)</span>
          <span className="flex items-center gap-1"><span className="w-2 h-3 bg-blue-400 rounded-sm inline-block" />Baraże (3–6)</span>
        </div>
      </div>
    </div>
  )
}
