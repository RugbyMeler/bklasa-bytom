import { Target } from 'lucide-react'
import type { Scorer } from '../../types'

interface Props {
  scorers: Scorer[]
}

export function ScorersWidget({ scorers }: Props) {
  const top = scorers.slice(0, 20)
  const maxGoals = top[0]?.goals ?? 1

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-accent-orange" />
          <span className="font-semibold text-sm text-slate-200">Strzelcy</span>
        </div>
        <span className="text-xs text-slate-500">{scorers.length} zawodników</span>
      </div>
      <div className="widget-body p-0">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-pitch-500 text-slate-400">
              <th className="text-center px-3 py-2 w-8">#</th>
              <th className="text-left px-3 py-2">Zawodnik</th>
              <th className="text-left px-2 py-2 min-w-[100px]">Klub</th>
              <th className="text-center px-3 py-2 w-10">Gole</th>
              <th className="px-3 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {top.map((scorer, i) => (
              <tr key={`${scorer.name}-${i}`} className="border-b border-pitch-600 hover:bg-pitch-600/30">
                <td className="px-3 py-2 text-center">
                  {i === 0 ? (
                    <span className="text-yellow-400">🥇</span>
                  ) : i === 1 ? (
                    <span className="text-slate-300">🥈</span>
                  ) : i === 2 ? (
                    <span className="text-amber-600">🥉</span>
                  ) : (
                    <span className="text-slate-500">{i + 1}</span>
                  )}
                </td>
                <td className="px-3 py-2 font-medium text-slate-100">{scorer.name}</td>
                <td className="px-2 py-2 text-slate-400 truncate max-w-[120px]">{scorer.club}</td>
                <td className="px-3 py-2 text-center font-bold text-white">{scorer.goals}</td>
                <td className="px-3 py-2">
                  <div className="h-1.5 bg-pitch-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-yellow-400 rounded-full"
                      style={{ width: `${(scorer.goals / maxGoals) * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
