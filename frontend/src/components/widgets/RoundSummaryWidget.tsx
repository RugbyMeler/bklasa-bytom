import { useState, useEffect, useCallback } from 'react'
import { Sparkles, AlertCircle, Newspaper } from 'lucide-react'
import type { RoundSummary } from '../../types'

const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ?? '/api'

interface Props {
  initial?: RoundSummary | null
}

export function RoundSummaryWidget({ initial }: Props) {
  const [summary, setSummary]     = useState<RoundSummary | null>(initial ?? null)
  const [loading, setLoading]     = useState(false)
  const [fetchError, setFetchErr] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    setFetchErr(null)
    try {
      const res = await fetch(`${API_BASE}/round-summary`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: RoundSummary = await res.json()
      setSummary(data)
    } catch (err) {
      setFetchErr(err instanceof Error ? err.message : 'Błąd połączenia')
    } finally {
      setLoading(false)
    }
  }, [])

  // Auto-fetch on mount if no cached text available
  useEffect(() => {
    if (!initial?.text) {
      fetchSummary()
    }
  }, [initial, fetchSummary])

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

        {/* Loading */}
        {loading && !summary?.text && (
          <div className="flex flex-col items-center justify-center gap-4 py-10">
            <Sparkles size={28} style={{ color: '#4ade80', opacity: 0.6 }} className="animate-pulse" />
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: '#94a3b8' }}>
                Gemini analizuje ligę…
              </p>
              <p className="text-xs mt-1" style={{ color: '#475569' }}>
                Może to potrwać kilka sekund
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {!loading && (fetchError || summary?.error) && !summary?.text && (
          <div className="flex flex-col items-center gap-3 py-8">
            <AlertCircle size={24} style={{ color: '#f87171' }} />
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: '#f87171' }}>
                Nie udało się wygenerować podsumowania
              </p>
              <p className="text-xs mt-1" style={{ color: '#64748b' }}>
                {fetchError ?? summary?.error}
              </p>
              {summary?.error === 'no completed round found' && (
                <p className="text-xs mt-2 px-3 py-2 rounded-lg"
                   style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                  Podsumowanie pojawi się automatycznie po zakończeniu kolejki.
                </p>
              )}
              {summary?.error === 'GOOGLE_API_KEY not set' && (
                <p className="text-xs mt-2 px-3 py-2 rounded-lg"
                   style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
                  Ustaw zmienną <code>GOOGLE_API_KEY</code> na Render.
                </p>
              )}
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
