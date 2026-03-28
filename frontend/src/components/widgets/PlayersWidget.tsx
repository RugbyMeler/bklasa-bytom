import { useState } from 'react'
import { Users } from 'lucide-react'
import type { PlayerStat } from '../../types'

interface Props {
  players: PlayerStat[]
}

type SortKey = 'goals' | 'yellow_cards' | 'red_cards'

export function PlayersWidget({ players }: Props) {
  const [sort, setSort] = useState<SortKey>('goals')

  const sorted = [...players].sort((a, b) => b[sort] - a[sort])
  const top = sorted.slice(0, 25)
  const maxVal = top[0]?.[sort] ?? 1

  const colLabel: Record<SortKey, string> = {
    goals: 'Gole',
    yellow_cards: 'Żółte',
    red_cards: 'Czerwone',
  }

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-accent-green" />
          <span className="font-semibold text-sm text-slate-200">Zawodnicy (LNP)</span>
        </div>
        <div className="flex gap-1">
          {(Object.keys(colLabel) as SortKey[]).map(k => (
            <button
              key={k}
              onClick={() => setSort(k)}
              className="text-xs px-2 py-0.5 rounded transition-all"
              style={{
                background: sort === k ? 'rgba(74,222,128,0.15)' : 'rgba(45,74,99,0.4)',
                border: `1px solid ${sort === k ? 'rgba(74,222,128,0.4)' : 'rgba(45,74,99,0.6)'}`,
                color: sort === k ? '#4ade80' : '#64748b',
              }}
            >
              {colLabel[k]}
            </button>
          ))}
        </div>
      </div>

      {players.length === 0 ? (
        <div className="widget-body flex items-center justify-center text-xs text-slate-500 py-8">
          Brak danych zawodników — mecze nie zostały jeszcze pobrane z LNP
        </div>
      ) : (
        <div className="widget-body p-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-pitch-500 text-slate-400">
                <th className="text-center px-3 py-2 w-8">#</th>
                <th className="text-left px-3 py-2">Zawodnik</th>
                <th className="text-center px-2 py-2 w-10">⚽</th>
                <th className="text-center px-2 py-2 w-10">🟨</th>
                <th className="text-center px-2 py-2 w-10">🟥</th>
                <th className="px-3 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {top.map((p, i) => (
                <tr key={`${p.name}-${i}`} className="border-b border-pitch-600 hover:bg-pitch-600/30">
                  <td className="px-3 py-1.5 text-center text-slate-500">{i + 1}</td>
                  <td className="px-3 py-1.5 font-medium text-slate-100">{p.name}</td>
                  <td className="px-2 py-1.5 text-center font-bold"
                      style={{ color: sort === 'goals' ? '#4ade80' : '#94a3b8' }}>
                    {p.goals || '—'}
                  </td>
                  <td className="px-2 py-1.5 text-center"
                      style={{ color: sort === 'yellow_cards' ? '#facc15' : '#94a3b8' }}>
                    {p.yellow_cards || '—'}
                  </td>
                  <td className="px-2 py-1.5 text-center"
                      style={{ color: sort === 'red_cards' ? '#f87171' : '#94a3b8' }}>
                    {p.red_cards || '—'}
                  </td>
                  <td className="px-3 py-1.5">
                    <div className="h-1.5 bg-pitch-600 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(p[sort] / maxVal) * 100}%`,
                          background: sort === 'goals'
                            ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                            : sort === 'yellow_cards'
                            ? 'linear-gradient(90deg, #ca8a04, #facc15)'
                            : 'linear-gradient(90deg, #b91c1c, #f87171)',
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-slate-600 px-3 py-2">
            Dane z laczynaspilka.pl · {players.length} zawodników
          </p>
        </div>
      )}
    </div>
  )
}
