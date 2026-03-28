import { Calendar } from 'lucide-react'
import clsx from 'clsx'
import type { MatchResult } from '../../types'

interface Props {
  results: MatchResult[]
}

function ScoreBadge({ hg, ag }: { hg: number; ag: number }) {
  return (
    <span className="font-mono font-bold text-white bg-pitch-600 px-2 py-0.5 rounded text-xs whitespace-nowrap">
      {hg} : {ag}
    </span>
  )
}

export function ResultsWidget({ results }: Props) {
  // Group by round
  const byRound: Record<number, MatchResult[]> = {}
  for (const r of results) {
    const rd = r.round ?? 0
    if (!byRound[rd]) byRound[rd] = []
    byRound[rd].push(r)
  }
  const rounds = Object.keys(byRound)
    .map(Number)
    .sort((a, b) => b - a) // newest first

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-accent-cyan" />
          <span className="font-semibold text-sm text-slate-200">Wyniki meczów</span>
        </div>
        <span className="text-xs text-slate-500">{results.length} meczów</span>
      </div>
      <div className="widget-body p-0 px-2">
        {rounds.map(round => (
          <div key={round} className="mb-4">
            <div className="sticky top-0 bg-pitch-700 py-1.5 px-2">
              <span className="text-xs font-semibold text-accent-blue uppercase tracking-wider">
                {round > 0 ? `${round}. Kolejka` : 'Inne'}
              </span>
            </div>
            <div className="space-y-1">
              {byRound[round].map((r, i) => {
                const hWin = r.home_goals > r.away_goals
                const aWin = r.away_goals > r.home_goals
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-pitch-600/40 text-xs"
                  >
                    <span className={clsx('flex-1 text-right truncate', hWin ? 'text-white font-semibold' : 'text-slate-400')}>
                      {r.home_team}
                    </span>
                    <ScoreBadge hg={r.home_goals} ag={r.away_goals} />
                    <span className={clsx('flex-1 truncate', aWin ? 'text-white font-semibold' : 'text-slate-400')}>
                      {r.away_team}
                    </span>
                    {r.date && (
                      <span className="text-slate-600 shrink-0">{r.date}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {results.length === 0 && (
          <div className="flex items-center justify-center h-32 text-slate-500 text-sm">
            Brak danych o wynikach
          </div>
        )}
      </div>
    </div>
  )
}
