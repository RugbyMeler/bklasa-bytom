import { Trophy, Calendar, BarChart2, TrendingUp, Activity, Grid, ChevronRight } from 'lucide-react'

interface SidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
}

const NAV_ITEMS = [
  { id: 'tabela',    label: 'Tabela ligowa',    icon: Trophy },
  { id: 'wyniki',    label: 'Wyniki',           icon: Calendar },
  { id: 'terminarz', label: 'Terminarz',        icon: Activity },
  { id: 'forma',     label: 'Forma drużyn',     icon: TrendingUp },
  { id: 'statystyki',label: 'Statystyki',       icon: BarChart2 },
  { id: 'wszystko',  label: 'Wszystkie widgety',icon: Grid },
]

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--card-bd)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #16a34a, #22c55e)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, flexShrink: 0,
          }}>⚽</div>
          <div>
            <div style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: 14,
              color: '#e8f0ec',
              letterSpacing: '0.08em',
              lineHeight: 1.1,
            }}>B-KLASA</div>
            <div style={{
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 400,
              fontSize: 11,
              color: '#22c55e',
              letterSpacing: '0.1em',
            }}>BYTOM</div>
          </div>
        </div>
        <div style={{
          marginTop: 8,
          fontSize: 10,
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>Sezon 2025/2026 · Śląski ZPN</div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 0' }}>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <div
            key={id}
            className={`sidebar-nav-item${activeSection === id ? ' active' : ''}`}
            onClick={() => onSectionChange(id)}
          >
            <Icon size={15} />
            <span>{label}</span>
            {activeSection === id && (
              <ChevronRight size={13} style={{ marginLeft: 'auto', opacity: 0.6 }} />
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--card-bd)' }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>
          Dane: regionalnyfutbol.pl · 90minut.pl
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="live-dot" />
          <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600, letterSpacing: '0.05em' }}>
            AKTUALIZACJA CO 15 MIN
          </span>
        </div>
      </div>
    </aside>
  )
}
