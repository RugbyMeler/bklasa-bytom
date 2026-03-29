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
          <Trophy size={16} style={{ color: 'var(--gold)' }} />
          <span className="font-semibold text-sm" style={{ color: '#e8f0ec' }}>Tabela ligowa</span>
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{teams.length} drużyn</span>
      </div>
      <div className="widget-body p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--card-bd)', color: 'var(--text-muted)' }}>
                <th className="text-left px-3 py-2 w-6">#</th>
                <th className="text-left px-3 py-2 min-w-[140px]">Drużyna</th>
                <th className="px-2 py-2 text-center w-8">M</th>
                <th className="px-2 py-2 text-center w-8">Z</th>
                <th className="px-2 py-2 text-center w-8">R</th>
                <th className="px-2 py-2 text-center w-8">P</th>
                <th className="px-2 py-2 text-center w-16">Bramki</th>
                <th className="px-2 py-2 text-center w-8">+/-</th>
                <th className="px-2 py-2 text-center w-10 font-bold" style={{ color: '#e8f0ec' }}>Pkt</th>
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
                      'transition-colors',
                      isPromotion && 'border-l-2',
                      isPlayoff && 'border-l-2',
                    )}
                    style={{
                      borderBottom: '1px solid rgba(30,58,42,0.5)',
                      borderLeftColor: isPromotion ? '#22c55e' : isPlayoff ? '#38bdf8' : undefined,
                    }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(34,197,94,0.04)'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}
                  >
                    <td className="px-3 py-2">
                      <span className="rank-num">{String(team.position).padStart(2, '0')}</span>
                    </td>
                    <td className="px-3 py-2 font-medium whitespace-nowrap" style={{ color: '#e8f0ec' }}>{team.name}</td>
                    <td className="px-2 py-2 text-center" style={{ color: '#b0c8b8' }}>{team.played}</td>
                    <td className="px-2 py-2 text-center" style={{ color: '#22c55e' }}>{team.won}</td>
                    <td className="px-2 py-2 text-center" style={{ color: '#fbbf24' }}>{team.drawn}</td>
                    <td className="px-2 py-2 text-center" style={{ color: '#ef4444' }}>{team.lost}</td>
                    <td className="px-2 py-2 text-center" style={{ color: '#b0c8b8' }}>
                      {team.goals_for}:{team.goals_against}
                    </td>
                    <td className={clsx('px-2 py-2 text-center font-mono')}
                        style={{ color: team.goal_difference > 0 ? '#22c55e' : team.goal_difference < 0 ? '#ef4444' : 'var(--text-muted)' }}>
                      {team.goal_difference > 0 ? '+' : ''}{team.goal_difference}
                    </td>
                    <td className="px-2 py-2 text-center font-bold" style={{ color: '#e8f0ec' }}>{team.points}</td>
                    <td className="px-2 py-2">
                      <FormDots form={team.form || []} trend={team.goals_trend} />
                    </td>
                    <td className="px-2 py-2 text-center font-mono" style={{ color: '#b0c8b8' }}>{team.ppg?.toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="flex gap-4 px-3 py-2 text-xs" style={{ borderTop: '1px solid rgba(30,58,42,0.5)', color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1">
            <span style={{ width: 8, height: 12, background: '#22c55e', borderRadius: 2, display: 'inline-block' }} />
            Awans (1–2)
          </span>
          <span className="flex items-center gap-1">
            <span style={{ width: 8, height: 12, background: '#38bdf8', borderRadius: 2, display: 'inline-block' }} />
            Baraże (3–6)
          </span>
        </div>
      </div>
    </div>
  )
}
