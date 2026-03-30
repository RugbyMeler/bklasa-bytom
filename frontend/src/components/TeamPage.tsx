import { ArrowLeft } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import type { DashboardData, AdvancedTeamStats, MatchResult } from '../types'

interface Props {
  teamName: string
  data: DashboardData
  onBack: () => void
}

function FormDot({ result, gf, ga, opponent }: { result: string; gf: number; ga: number; opponent?: string }) {
  const color = result === 'W' ? '#22c55e' : result === 'D' ? '#fbbf24' : '#ef4444'
  const label = result === 'W' ? 'W' : result === 'D' ? 'R' : 'P'
  return (
    <span
      title={`${gf}–${ga}${opponent ? ` vs ${opponent}` : ''}`}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 26, height: 26, borderRadius: 6, fontSize: 11, fontWeight: 700,
        background: `${color}22`, border: `1px solid ${color}55`, color,
        cursor: 'default',
      }}
    >
      {label}
    </span>
  )
}

function StatBox({ label, value, sub, color = '#e8f0ec' }: { label: string; value: React.ReactNode; sub?: string; color?: string }) {
  return (
    <div style={{
      background: 'rgba(45,74,99,0.3)', border: '1px solid rgba(45,74,99,0.5)',
      borderRadius: 10, padding: '12px 14px', textAlign: 'center',
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase',
      color: 'var(--green)', borderBottom: '1px solid rgba(34,197,94,0.2)',
      paddingBottom: 6, marginBottom: 12, marginTop: 24,
    }}>
      {children}
    </div>
  )
}

export function TeamPage({ teamName, data, onBack }: Props) {
  const team = data.advanced_teams.find(t => t.name === teamName) as AdvancedTeamStats | undefined
  const eloEntry = data.elo?.find(e => e.team === teamName)
  const formEntry = data.form_table?.find(e => e.team === teamName)

  // All results involving this team, sorted by round then date
  const teamResults: MatchResult[] = (data.results ?? [])
    .filter(r => r.home_team === teamName || r.away_team === teamName)
    .sort((a, b) => (a.round ?? 999) - (b.round ?? 999))

  // Goal trend for chart
  const goalTrendData = (team?.goals_trend ?? []).map((g, i) => ({
    match: i + 1,
    gf: g.gf,
    ga: g.ga,
    venue: g.venue,
    opponent: g.opponent,
  }))

  // Home/Away bar chart data
  const haData = team ? [
    { name: 'Dom', gf: team.home.gf, ga: team.home.ga, ppg: team.home.ppg },
    { name: 'Wyjazd', gf: team.away.gf, ga: team.away.ga, ppg: team.away.ppg },
  ] : []

  const positionColor = (pos: number) => {
    if (pos <= 2) return '#22c55e'
    if (pos <= 6) return '#38bdf8'
    return '#94a3b8'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(180deg, #091510 0%, var(--bg) 100%)',
        borderBottom: '1px solid var(--card-bd)',
        padding: '20px 28px',
        position: 'sticky', top: 0, zIndex: 50,
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: 'var(--green)', fontSize: 13, fontWeight: 600,
              padding: '7px 14px', borderRadius: 8,
              background: 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.25)',
              cursor: 'pointer', flexShrink: 0,
            }}
          >
            <ArrowLeft size={15} />
            Wróć do tabeli
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {team && (
              <div style={{
                width: 36, height: 36, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: `${positionColor(team.position)}22`,
                border: `2px solid ${positionColor(team.position)}`,
                fontSize: 14, fontWeight: 700, color: positionColor(team.position),
                flexShrink: 0,
              }}>
                {team.position}
              </div>
            )}
            <div>
              <h1 style={{
                fontFamily: "'Oswald', sans-serif",
                fontSize: 24, fontWeight: 700, color: '#e8f0ec',
                letterSpacing: '0.04em', textTransform: 'uppercase', lineHeight: 1,
              }}>
                {teamName}
              </h1>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
                B-Klasa Bytom · Sezon 2025/2026
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 28px', maxWidth: 1100, margin: '0 auto' }}>

        {!team ? (
          <div style={{ color: 'var(--text-muted)', textAlign: 'center', paddingTop: 60 }}>
            Brak danych dla drużyny „{teamName}"
          </div>
        ) : (
          <>
            {/* ── Key stats ── */}
            <SectionHeader>Statystyki sezonu</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
              <StatBox label="Miejsce" value={team.position} color={positionColor(team.position)} />
              <StatBox label="Punkty" value={team.points} color="#e8f0ec" />
              <StatBox label="Mecze" value={team.played} color="#94a3b8" />
              <StatBox label="Bilans" value={`${team.won}/${team.drawn}/${team.lost}`} sub="W/R/P" color="#b0c8b8" />
              <StatBox label="Bramki" value={`${team.goals_for}:${team.goals_against}`} color="#fbbf24" />
              <StatBox label="Różnica" value={`${team.goal_difference > 0 ? '+' : ''}${team.goal_difference}`}
                color={team.goal_difference > 0 ? '#22c55e' : team.goal_difference < 0 ? '#ef4444' : '#94a3b8'} />
              <StatBox label="Pkt/mecz" value={team.ppg.toFixed(2)} color="#38bdf8" />
              {eloEntry && <StatBox label="Ranking Elo" value={Math.round(eloEntry.elo)} color="#fb923c" sub={`#${eloEntry.rank}`} />}
            </div>

            {/* ── Form ── */}
            <SectionHeader>Forma (ostatnie 5 meczów)</SectionHeader>
            <div style={{ display: 'flex', gap: 6 }}>
              {[...(team.goals_trend ?? [])].slice(-5).map((g, i) => (
                <FormDot
                  key={i}
                  result={team.form[i] ?? (g.gf > g.ga ? 'W' : g.gf === g.ga ? 'D' : 'L')}
                  gf={g.gf}
                  ga={g.ga}
                  opponent={g.opponent}
                />
              ))}
            </div>
            {/* Form stats from form_table (last 5) */}
            {formEntry && (
              <div style={{ marginTop: 10, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[
                  { label: 'Mecze (ost. 5)', value: formEntry.played },
                  { label: 'Wygrane', value: formEntry.won, color: '#22c55e' },
                  { label: 'Remisy', value: formEntry.drawn, color: '#fbbf24' },
                  { label: 'Porażki', value: formEntry.lost, color: '#ef4444' },
                  { label: 'Bramki', value: `${formEntry.gf}:${formEntry.ga}` },
                  { label: 'Pkt (ost. 5)', value: formEntry.points, color: '#38bdf8' },
                ].map(s => (
                  <div key={s.label} style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {s.label}: <span style={{ fontWeight: 700, color: s.color ?? '#e8f0ec' }}>{s.value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Advanced stats ── */}
            <SectionHeader>Zaawansowane metryki</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
              <StatBox label="Exp. wygrane (pitagoras)" value={team.pythagorean_expectation.toFixed(2)} color="#a78bfa" />
              <StatBox label="Pitagoras pkt" value={team.pythagorean_points.toFixed(1)} color="#a78bfa" />
              <StatBox label="Pkt ponad oczekiwania" value={`${team.points_above_expectation > 0 ? '+' : ''}${team.points_above_expectation.toFixed(1)}`}
                color={team.points_above_expectation > 0 ? '#22c55e' : team.points_above_expectation < 0 ? '#ef4444' : '#94a3b8'} />
              <StatBox label="Czyste konta" value={team.clean_sheets} color="#22c55e" />
              <StatBox label="Bez gola" value={team.failed_to_score} color="#ef4444" />
              <StatBox label="BTTS" value={team.btts} color="#fbbf24" />
              <StatBox label="Over 2.5" value={team.over_2_5} color="#fb923c" />
              <StatBox label="Over 3.5" value={team.over_3_5} color="#f97316" />
            </div>

            {/* ── Streaks ── */}
            <SectionHeader>Passy</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              <StatBox label="Seria zwycięstw" value={team.win_streak} color={team.win_streak >= 3 ? '#22c55e' : '#94a3b8'} sub="mecze z rzędu" />
              <StatBox label="Seria bez porażki" value={team.unbeaten_streak} color={team.unbeaten_streak >= 4 ? '#38bdf8' : '#94a3b8'} sub="mecze z rzędu" />
              <StatBox label="Seria strzelecka" value={team.scoring_streak} color={team.scoring_streak >= 5 ? '#fb923c' : '#94a3b8'} sub="mecze z golem" />
            </div>

            {/* ── Home / Away ── */}
            <SectionHeader>Dom vs Wyjazd</SectionHeader>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { label: 'Dom', split: team.home, color: '#22c55e' },
                { label: 'Wyjazd', split: team.away, color: '#38bdf8' },
              ].map(({ label, split, color }) => (
                <div key={label} style={{
                  background: 'var(--card-bg)', border: '1px solid var(--card-bd)',
                  borderRadius: 10, overflow: 'hidden',
                }}>
                  <div style={{
                    background: 'var(--card-hdr)', padding: '8px 14px',
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
                    color, textTransform: 'uppercase',
                    borderBottom: '1px solid var(--card-bd)',
                  }}>
                    {label}
                  </div>
                  <div style={{ padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {[
                      { l: 'Mecze', v: split.played },
                      { l: 'W/R/P', v: `${split.won}/${split.drawn}/${split.lost}` },
                      { l: 'Bramki', v: `${split.gf}:${split.ga}` },
                      { l: 'Pkt', v: split.points },
                      { l: 'Pkt/mecz', v: split.ppg.toFixed(2) },
                      { l: 'Goli/mecz', v: split.gf_per_game.toFixed(1) },
                    ].map(s => (
                      <div key={s.l} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#e8f0ec' }}>{s.v}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{s.l}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Home/Away bar chart ── */}
            {haData.length > 0 && (
              <>
                <div style={{ height: 120, marginTop: 12 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={haData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                      <Tooltip
                        contentStyle={{ background: '#1e2d3d', border: '1px solid #2d4a63', fontSize: 11 }}
                        formatter={(v: number, name: string) => [v, name === 'gf' ? 'Strzelone' : 'Stracone']}
                      />
                      <Bar dataKey="gf" fill="#22c55e" radius={[3, 3, 0, 0]} name="gf" />
                      <Bar dataKey="ga" fill="#ef4444" radius={[3, 3, 0, 0]} name="ga" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#22c55e', borderRadius: 2, marginRight: 4 }} />Strzelone</span>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#ef4444', borderRadius: 2, marginRight: 4 }} />Stracone</span>
                </div>
              </>
            )}

            {/* ── Goal trend chart ── */}
            {goalTrendData.length > 0 && (
              <>
                <SectionHeader>Trendy bramkowe (mecz po meczu)</SectionHeader>
                <div style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={goalTrendData} margin={{ left: 0, right: 12, top: 4, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(45,74,99,0.4)" />
                      <XAxis dataKey="match" tick={{ fontSize: 9, fill: '#64748b' }} label={{ value: 'Mecz', position: 'insideBottom', offset: -2, fontSize: 9, fill: '#64748b' }} />
                      <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                      <Tooltip
                        contentStyle={{ background: '#1e2d3d', border: '1px solid #2d4a63', fontSize: 11 }}
                        formatter={(v: number, name: string) => [v, name === 'gf' ? 'Strzelone' : 'Stracone']}
                        labelFormatter={(label, payload) => {
                          const entry = payload?.[0]?.payload
                          return entry?.opponent ? `vs ${entry.opponent} (${entry.venue === 'H' ? 'dom' : 'wyjazd'})` : `Mecz ${label}`
                        }}
                      />
                      <Line type="monotone" dataKey="gf" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: '#22c55e' }} name="gf" />
                      <Line type="monotone" dataKey="ga" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: '#ef4444' }} name="ga" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#22c55e', borderRadius: 2, marginRight: 4 }} />Strzelone</span>
                  <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#ef4444', borderRadius: 2, marginRight: 4 }} />Stracone</span>
                </div>
              </>
            )}

            {/* ── All results ── */}
            <SectionHeader>Wszystkie mecze sezonu ({teamResults.length})</SectionHeader>
            <div style={{
              background: 'var(--card-bg)', border: '1px solid var(--card-bd)',
              borderRadius: 10, overflow: 'hidden',
            }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--card-hdr)', borderBottom: '1px solid var(--card-bd)', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: 40 }}>Kol.</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Gospodarz</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: 60 }}>Wynik</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left' }}>Gość</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: 80 }}>Data</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center', width: 50 }}>Wynik</th>
                  </tr>
                </thead>
                <tbody>
                  {teamResults.map((r, i) => {
                    const isHome = r.home_team === teamName
                    const teamGoals = isHome ? r.home_goals : r.away_goals
                    const oppGoals = isHome ? r.away_goals : r.home_goals
                    const result = teamGoals > oppGoals ? 'W' : teamGoals < oppGoals ? 'L' : 'D'
                    const resultColor = result === 'W' ? '#22c55e' : result === 'L' ? '#ef4444' : '#fbbf24'
                    const resultLabel = result === 'W' ? 'W' : result === 'L' ? 'P' : 'R'
                    return (
                      <tr key={i} style={{
                        borderBottom: '1px solid rgba(30,58,42,0.4)',
                        background: i % 2 === 0 ? 'transparent' : 'rgba(45,74,99,0.08)',
                      }}>
                        <td style={{ padding: '7px 12px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          {r.round ?? '—'}
                        </td>
                        <td style={{
                          padding: '7px 12px', color: isHome ? '#e8f0ec' : 'var(--text-muted)',
                          fontWeight: isHome ? 600 : 400,
                        }}>
                          {r.home_team}
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'center', fontFamily: 'monospace', color: '#e8f0ec', fontWeight: 700 }}>
                          {r.home_goals}–{r.away_goals}
                        </td>
                        <td style={{
                          padding: '7px 12px', color: !isHome ? '#e8f0ec' : 'var(--text-muted)',
                          fontWeight: !isHome ? 600 : 400,
                        }}>
                          {r.away_team}
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
                          {r.date || '—'}
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 22, height: 22, borderRadius: 4, fontSize: 10, fontWeight: 700,
                            background: `${resultColor}22`, border: `1px solid ${resultColor}55`, color: resultColor,
                          }}>
                            {resultLabel}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <footer style={{ textAlign: 'center', padding: '20px', fontSize: 11, color: 'var(--text-muted)', marginTop: 16, borderTop: '1px solid var(--card-bd)' }}>
        Dane: 90minut.pl · Sezon 2025/2026
      </footer>
    </div>
  )
}
