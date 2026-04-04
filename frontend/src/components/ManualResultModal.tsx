import { useState, useEffect } from 'react'
import { X, Plus, Trash2 } from 'lucide-react'
import axios from 'axios'

interface ManualResult {
  round: number
  home_team: string
  home_goals: number
  away_goals: number
  away_team: string
  date: string
  source: 'manual'
}

interface Props {
  teams: string[]
  onClose: () => void
  onSaved: () => void
}

export function ManualResultModal({ teams, onClose, onSaved }: Props) {
  const [existing, setExisting] = useState<ManualResult[]>([])
  const [round, setRound] = useState('')
  const [homeTeam, setHomeTeam] = useState('')
  const [homeGoals, setHomeGoals] = useState('')
  const [awayGoals, setAwayGoals] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [passphrase, setPassphrase] = useState(() => localStorage.getItem('manual-passphrase') ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const sortedTeams = [...teams].sort()

  useEffect(() => {
    axios.get('/api/manual-results').then(r => setExisting(r.data.manual_results ?? []))
  }, [])

  const handleAdd = async () => {
    setError('')
    if (!round || !homeTeam || !awayTeam || homeGoals === '' || awayGoals === '') {
      setError('Uzupełnij wszystkie pola.')
      return
    }
    if (homeTeam === awayTeam) {
      setError('Gospodarz i gość muszą być różnymi drużynami.')
      return
    }
    if (!passphrase) {
      setError('Podaj hasło dostępu.')
      return
    }
    setSaving(true)
    try {
      localStorage.setItem('manual-passphrase', passphrase)
      await axios.post('/api/manual-results', {
        round: Number(round),
        home_team: homeTeam,
        home_goals: Number(homeGoals),
        away_goals: Number(awayGoals),
        away_team: awayTeam,
        date,
      }, { headers: { 'X-Passphrase': passphrase } })
      const r = await axios.get('/api/manual-results')
      setExisting(r.data.manual_results ?? [])
      // reset form
      setRound('')
      setHomeTeam('')
      setHomeGoals('')
      setAwayGoals('')
      setAwayTeam('')
      onSaved()
    } catch (e: any) {
      if (e?.response?.status === 403) setError('Nieprawidłowe hasło.')
      else setError('Błąd zapisu. Spróbuj ponownie.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (idx: number) => {
    try {
      await axios.delete(`/api/manual-results/${idx}`, { headers: { 'X-Passphrase': passphrase } })
      const r = await axios.get('/api/manual-results')
      setExisting(r.data.manual_results ?? [])
      onSaved()
    } catch {
      setError('Błąd usuwania.')
    }
  }

  const inputStyle = {
    background: 'rgba(9,21,16,0.8)',
    border: '1px solid var(--card-bd)',
    borderRadius: 8,
    color: '#e8f0ec',
    padding: '8px 10px',
    fontSize: 13,
    outline: 'none',
    width: '100%',
  }

  const selectStyle = { ...inputStyle }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--card-bd)',
        borderRadius: 14,
        width: '100%',
        maxWidth: 520,
        boxShadow: '0 8px 40px rgba(0,0,0,0.7)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          background: 'var(--card-hdr)',
          borderBottom: '1px solid var(--card-bd)',
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚽</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#e8f0ec' }}>
              Dodaj wynik meczu
            </span>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '18px' }}>
          {/* Existing manual results */}
          {existing.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--green)', marginBottom: 8 }}>
                Wprowadzone ręcznie
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {existing.map((m, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(34,197,94,0.06)',
                    border: '1px solid rgba(34,197,94,0.2)',
                    borderRadius: 8, padding: '8px 12px',
                    fontSize: 12,
                  }}>
                    <span style={{ color: 'var(--text-muted)', marginRight: 8, flexShrink: 0 }}>
                      Kol. {m.round}
                    </span>
                    <span style={{ color: '#e8f0ec', flex: 1 }}>
                      {m.home_team} <strong style={{ color: 'var(--green)' }}>{m.home_goals}–{m.away_goals}</strong> {m.away_team}
                    </span>
                    <button
                      onClick={() => handleDelete(i)}
                      style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', marginLeft: 8, flexShrink: 0 }}
                      title="Usuń"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add form */}
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
            Nowy wynik
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Hasło dostępu</div>
            <input
              type="password"
              value={passphrase}
              onChange={e => setPassphrase(e.target.value)}
              style={inputStyle}
              placeholder="••••••••"
              autoComplete="off"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Kolejka</div>
              <input
                type="number" min="1" max="30"
                value={round}
                onChange={e => setRound(e.target.value)}
                style={inputStyle}
                placeholder="19"
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Data</div>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 8, alignItems: 'end', marginBottom: 8 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Gospodarz</div>
              <select value={homeTeam} onChange={e => setHomeTeam(e.target.value)} style={selectStyle}>
                <option value="">— wybierz —</option>
                {sortedTeams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingBottom: 1 }}>
              <input
                type="number" min="0" max="30"
                value={homeGoals}
                onChange={e => setHomeGoals(e.target.value)}
                style={{ ...inputStyle, width: 48, textAlign: 'center' }}
                placeholder="0"
              />
              <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>–</span>
              <input
                type="number" min="0" max="30"
                value={awayGoals}
                onChange={e => setAwayGoals(e.target.value)}
                style={{ ...inputStyle, width: 48, textAlign: 'center' }}
                placeholder="0"
              />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Gość</div>
              <select value={awayTeam} onChange={e => setAwayTeam(e.target.value)} style={selectStyle}>
                <option value="">— wybierz —</option>
                {sortedTeams.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {error && (
            <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>{error}</div>
          )}

          <button
            onClick={handleAdd}
            disabled={saving}
            style={{
              width: '100%', marginTop: 4,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '10px',
              background: saving ? 'rgba(34,197,94,0.1)' : 'linear-gradient(135deg, #16a34a, #22c55e)',
              border: 'none', borderRadius: 8,
              color: saving ? 'var(--green)' : '#0f172a',
              fontSize: 13, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            <Plus size={15} />
            {saving ? 'Zapisuję...' : 'Dodaj wynik'}
          </button>

          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, textAlign: 'center', lineHeight: 1.5 }}>
            Ręczne wyniki są używane do momentu opublikowania oficjalnego rezultatu na 90minut.pl — wtedy zastępują je automatycznie.
          </p>
        </div>
      </div>
    </div>
  )
}
