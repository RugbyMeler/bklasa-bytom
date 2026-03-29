import { Sparkles, Newspaper, Clock } from 'lucide-react'
import type { RoundSummary } from '../../types'

interface Props {
  summary?: RoundSummary | null
}

export function RoundSummaryWidget({ summary }: Props) {
  const paragraphs = summary?.text
    ? summary.text.split(/\n+/).map(p => p.trim()).filter(Boolean)
    : []

  return (
    <div className="widget-card h-full flex flex-col" style={{ background: 'rgba(10,22,40,0.95)' }}>

      {/* Header */}
      <div className="widget-header flex items-center justify-between px-4 py-3"
           style={{ borderBottom: '1px solid rgba(74,222,128,0.15)' }}>
        <div className="flex items-center gap-2">
          <Newspaper size={15} style={{ color: '#4ade80' }} />
          <span className="text-sm font-semibold" style={{ color: '#f1f5f9' }}>
            Podsumowanie kolejki
            {summary?.round ? (
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}>
                Kolejka {summary.round}
              </span>
            ) : null}
          </span>
        </div>
        <span className="text-xs" style={{ color: '#334155' }}>
          Generowane automatycznie po kolejce
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-4">

        {/* Not yet generated — round still in progress */}
        {!summary?.text && (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <Clock size={26} style={{ color: '#334155' }} />
            <div className="text-center">
              <p className="text-sm font-medium" style={{ color: '#64748b' }}>
                Podsumowanie pojawi się automatycznie
              </p>
              <p className="text-xs mt-1" style={{ color: '#334155' }}>
                po zakończeniu wszystkich meczów kolejki
              </p>
            </div>
          </div>
        )}

        {/* Article */}
        {summary?.text && (
          <article>
            <div className="flex items-center gap-3 mb-4">
              <div style={{ flex: 1, height: 1, background: 'rgba(74,222,128,0.25)' }} />
              <Sparkles size={12} style={{ color: '#4ade80', opacity: 0.6 }} />
              <div style={{ flex: 1, height: 1, background: 'rgba(74,222,128,0.25)' }} />
            </div>

            <div className="space-y-3">
              {paragraphs.map((para, i) => (
                <p key={i} className="leading-relaxed"
                   style={{
                     color: i === 0 ? '#e2e8f0' : '#94a3b8',
                     fontWeight: i === 0 ? 500 : 400,
                     fontSize: i === 0 ? '14px' : '13px',
                   }}>
                  {para}
                </p>
              ))}
            </div>

            <div className="flex items-center justify-between mt-5 pt-3"
                 style={{ borderTop: '1px solid rgba(45,74,99,0.4)' }}>
              <div className="flex items-center gap-1.5">
                <Sparkles size={10} style={{ color: '#475569' }} />
                <span className="text-xs" style={{ color: '#475569' }}>
                  Wygenerowane przez {summary.model ?? 'Gemini AI'}
                </span>
              </div>
              <span className="text-xs" style={{ color: '#334155' }}>
                B-Klasa Bytom · Kolejka {summary.round}
              </span>
            </div>
          </article>
        )}
      </div>
    </div>
  )
}
