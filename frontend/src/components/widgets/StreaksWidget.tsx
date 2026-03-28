import { Flame } from 'lucide-react'
import type { AdvancedTeamStats } from '../../types'

interface Props {
  teams: AdvancedTeamStats[]
}

function StreakBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-bold text-sm w-6 text-right" style={{ color }}>{value}</span>
      <div className="flex-1 h-2 bg-pitch-600 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, background: color }}
        />
      </div>
    </div>
  )
}

export function StreaksWidget({ teams }: Props) {
  const maxWin = Math.max(...teams.map(t => t.win_streak ?? 0), 1)
  const maxUnbeaten = Math.max(...teams.map(t => t.unbeaten_streak ?? 0), 1)
  const maxScoring = Math.max(...teams.map(t => t.scoring_streak ?? 0), 1)

  const sorted = [...teams].sort((a, b) => (b.win_streak ?? 0) - (a.win_streak ?? 0))

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Flame size={16} className="text-accent-orange" />
          <span className="font-semibold text-sm text-slate-200">Passy (aktualne)</span>
        </div>
      </div>
      <div className="widget-body p-0">
        <div className="px-3 py-2 border-b border-pitch-600 grid grid-cols-3 gap-2 text-xs text-center text-slate-400">
          <span className="text-green-400 font-semibold">Seria zwycięstw</span>
          <span className="text-blue-400 font-semibold">Bez porażki</span>
          <span className="text-yellow-400 font-semibold">Strzelanie</span>
        </div>
        <div className="px-3 py-1.5 space-y-2">
          {sorted.map(team => (
            <div key={team.name} className="grid grid-cols-[1fr_auto_1fr_auto_1fr] gap-x-3 gap-y-0.5 items-center">
              <StreakBar value={team.win_streak ?? 0} max={maxWin} color="#22c55e" />
              <span className="text-xs text-slate-300 text-center whitespace-nowrap truncate max-w-[90px] col-span-1">
                {team.name.length > 14 ? team.name.slice(0, 12) + '…' : team.name}
              </span>
              <StreakBar value={team.unbeaten_streak ?? 0} max={maxUnbeaten} color="#3b82f6" />
              <span></span>
              <StreakBar value={team.scoring_streak ?? 0} max={maxScoring} color="#eab308" />
            </div>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-pitch-600 text-xs text-slate-500">
          * Aktualne passy liczone od ostatniego meczu wstecz
        </div>
      </div>
    </div>
  )
}
