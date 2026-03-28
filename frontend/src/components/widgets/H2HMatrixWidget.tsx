import { useState } from 'react'
import type { H2HMatrix } from '../../types'

interface Props { h2h: H2HMatrix }

const cellColor = (results: string[]) => {
  if (!results.length) return 'rgba(30,45,61,0.3)'
  const w = results.filter(r => r === 'W').length
  const l = results.filter(r => r === 'L').length
  if (w > l) return 'rgba(74,222,128,0.25)'
  if (l > w) return 'rgba(248,113,113,0.25)'
  return 'rgba(251,191,36,0.2)'
}

const cellText = (results: string[]) => {
  if (!results.length) return '·'
  return results.join('')
}

const cellTextColor = (results: string[]) => {
  if (!results.length) return '#334155'
  const w = results.filter(r => r === 'W').length
  const l = results.filter(r => r === 'L').length
  if (w > l) return '#4ade80'
  if (l > w) return '#f87171'
  return '#fbbf24'
}

// Shorten team name to ~6 chars (last word prefix)
const abbr = (name: string) => {
  const parts = name.split(' ')
  if (parts.length === 1) return name.slice(0, 6)
  return parts[parts.length - 1].slice(0, 6)
}

export function H2HMatrixWidget({ h2h }: Props) {
  const [highlight, setHighlight] = useState<string | null>(null)
  const { teams, matrix } = h2h
  if (!teams.length) return null

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <span className="text-accent-green">⚔️</span>
          <span className="font-semibold text-sm text-slate-200">Mecze bezpośrednie (H2H)</span>
        </div>
        <span className="text-xs text-slate-500">wiersz vs kolumna · 🟩W 🟨R 🟥P</span>
      </div>
      <div className="widget-body overflow-auto">
        <table className="text-xs border-collapse" style={{ minWidth: teams.length * 42 + 90 }}>
          <thead>
            <tr>
              <th className="px-2 py-1 text-left text-slate-500 sticky left-0"
                  style={{ background: 'var(--card-bg)', minWidth: 90 }}>Drużyna</th>
              {teams.map(t => (
                <th key={t}
                    className="py-1 text-center"
                    style={{ minWidth: 38, color: highlight === t ? '#4ade80' : '#64748b' }}
                    title={t}>
                  {abbr(t)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map(row => (
              <tr key={row}
                  onMouseEnter={() => setHighlight(row)}
                  onMouseLeave={() => setHighlight(null)}
                  className="hover:bg-pitch-600/20">
                <td className="px-2 py-0.5 text-slate-300 sticky left-0 font-medium"
                    style={{ background: 'var(--card-bg)', minWidth: 90 }}
                    title={row}>
                  {row.split(' ').slice(-1)[0].slice(0, 12)}
                </td>
                {teams.map(col => {
                  const res = row === col ? [] : (matrix[row]?.[col] ?? [])
                  const isDiag = row === col
                  return (
                    <td key={col}
                        className="py-0.5 text-center font-bold"
                        style={{
                          background: isDiag ? 'rgba(45,74,99,0.5)' : cellColor(res),
                          color: isDiag ? '#1e2d3d' : cellTextColor(res),
                          border: (highlight === row || highlight === col)
                            ? '1px solid rgba(74,222,128,0.3)'
                            : '1px solid rgba(45,74,99,0.3)',
                          fontSize: 10,
                        }}
                        title={`${row} vs ${col}: ${res.join(', ') || '—'}`}>
                      {isDiag ? '—' : cellText(res)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-600 mt-2">W=wygrana R=remis P=przegrana · z perspektywy wiersza</p>
      </div>
    </div>
  )
}
