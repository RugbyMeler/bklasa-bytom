import type { FormTableEntry, FormResult } from '../../types'

interface Props { formTable: FormTableEntry[] }

const badgeClass = (r: string) => {
  const base = 'inline-flex items-center justify-center w-5 h-5 rounded text-xs font-bold cursor-default'
  if (r === 'W') return `${base} bg-green-500/20 text-green-400 border border-green-500/30`
  if (r === 'D') return `${base} bg-yellow-500/20 text-yellow-400 border border-yellow-500/30`
  return `${base} bg-red-500/20 text-red-400 border border-red-500/30`
}

export function FormTableWidget({ formTable }: Props) {
  if (!formTable.length) return null

  return (
    <div className="widget-card">
      <div className="widget-header">
        <div className="flex items-center gap-2">
          <span className="text-accent-green">🔥</span>
          <span className="font-semibold text-sm text-slate-200">Tabela — ostatnie 5 meczy</span>
        </div>
        <span className="text-xs text-slate-500">mini tabela</span>
      </div>
      <div className="widget-body p-0">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-pitch-500 text-slate-400">
              <th className="px-2 py-2 text-center w-6">#</th>
              <th className="px-2 py-2 text-left">Drużyna</th>
              <th className="px-1 py-2 text-center w-7">M</th>
              <th className="px-1 py-2 text-center w-7">W</th>
              <th className="px-1 py-2 text-center w-7">R</th>
              <th className="px-1 py-2 text-center w-7">P</th>
              <th className="px-1 py-2 text-center w-14">Br</th>
              <th className="px-2 py-2 text-center w-8 font-bold text-white">Pkt</th>
              <th className="px-2 py-2 text-left">Forma</th>
            </tr>
          </thead>
          <tbody>
            {formTable.map((row, i) => (
              <tr key={row.team} className="border-b border-pitch-600 hover:bg-pitch-600/30">
                <td className="px-2 py-1.5 text-center text-slate-500">{i + 1}</td>
                <td className="px-2 py-1.5 text-slate-100 truncate max-w-[120px]">{row.team}</td>
                <td className="px-1 py-1.5 text-center text-slate-400">{row.played}</td>
                <td className="px-1 py-1.5 text-center text-green-400">{row.won}</td>
                <td className="px-1 py-1.5 text-center text-yellow-400">{row.drawn}</td>
                <td className="px-1 py-1.5 text-center text-red-400">{row.lost}</td>
                <td className="px-1 py-1.5 text-center text-slate-400">{row.gf}:{row.ga}</td>
                <td className="px-2 py-1.5 text-center font-bold text-white">{row.points}</td>
                <td className="px-2 py-1.5">
                  <div className="flex gap-0.5">
                    {[...row.form].reverse().map((f: FormResult, j: number) => (
                      <span key={j} className={badgeClass(f.result)} title={`${f.gf}–${f.ga}${f.opponent ? ` vs ${f.opponent}` : ''}`}>
                        {f.result}
                      </span>
                    ))}
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
