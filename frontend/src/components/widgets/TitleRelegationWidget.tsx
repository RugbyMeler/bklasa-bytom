import type { TitleRelegationEntry } from '../../types'

interface Props { data: TitleRelegationEntry[] }

export function TitleRelegationWidget({ data }: Props) {
  if (!data.length) return null

  const sorted = [...data].sort((a, b) => a.position - b.position)

  // B-klasa: top 2 promoted, 3–6 qualify for playoffs, no relegation
  const zone = (pos: number) => {
    if (pos === 1) return { bg: 'rgba(74,222,128,0.15)', border: 'rgba(74,222,128,0.4)', label: '⬆️' }
    if (pos === 2) return { bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.25)', label: '⬆️' }
    if (pos <= 6)  return { bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.25)', label: '🔵' }
    return { bg: 'transparent', border: 'rgba(45,74,99,0.4)', label: '' }
  }

  const maxMax = Math.max(...data.map(d => d.max_points))

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <span className="text-accent-green">🏁</span>
          <span className="font-semibold text-sm text-slate-200">Walka o awans / play-off</span>
        </div>
        <span className="text-xs text-slate-500">maks. pkt · projekcja</span>
      </div>
      <div className="widget-body p-0">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-pitch-500 text-slate-400">
              <th className="px-2 py-2 text-center w-6">#</th>
              <th className="px-2 py-2 text-left">Drużyna</th>
              <th className="px-2 py-2 text-center w-8">Pkt</th>
              <th className="px-2 py-2 text-center w-8">Maks</th>
              <th className="px-2 py-2 text-center w-12">PPG</th>
              <th className="px-2 py-2 text-center w-14">Proj.</th>
              <th className="px-2 py-2 w-24">Postęp</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(row => {
              const z = zone(row.position)
              const pct = (row.points / row.max_points) * 100
              const projPct = Math.min(100, (row.projected / maxMax) * 100)

              return (
                <tr key={row.team}
                    className="border-b hover:opacity-90 transition-opacity"
                    style={{ background: z.bg, borderColor: 'rgba(45,74,99,0.4)' }}>
                  <td className="px-2 py-1.5 text-center text-slate-500">{row.position}</td>
                  <td className="px-2 py-1.5 text-slate-200">
                    {z.label && <span className="mr-1">{z.label}</span>}
                    {row.team}
                  </td>
                  <td className="px-2 py-1.5 text-center font-bold text-white">{row.points}</td>
                  <td className="px-2 py-1.5 text-center text-slate-400">{row.max_points}</td>
                  <td className="px-2 py-1.5 text-center"
                      style={{ color: row.ppg >= 2 ? '#4ade80' : row.ppg >= 1 ? '#fbbf24' : '#f87171' }}>
                    {row.ppg}
                  </td>
                  <td className="px-2 py-1.5 text-center font-semibold"
                      style={{ color: row.projected >= 45 ? '#4ade80' : row.projected >= 25 ? '#fbbf24' : '#f87171' }}>
                    {row.projected}
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="relative h-2 bg-pitch-600 rounded-full overflow-hidden">
                      {/* Projected bar (lighter) */}
                      <div className="absolute inset-y-0 left-0 rounded-full opacity-30"
                           style={{ width: `${projPct}%`, background: '#4ade80' }} />
                      {/* Actual points bar */}
                      <div className="absolute inset-y-0 left-0 rounded-full"
                           style={{ width: `${pct}%`, background: '#4ade80' }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="flex gap-4 px-3 py-2 text-xs text-slate-500">
          <span><span className="text-green-400 mr-1">⬆️</span>awans (1–2)</span>
          <span><span className="text-blue-400 mr-1">🔵</span>baraże (3–6)</span>
          <span className="ml-auto">Proj. = PPG × liczba kolejek</span>
        </div>
      </div>
    </div>
  )
}
