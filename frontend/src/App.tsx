import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLeagueData } from './hooks/useLeagueData'
import { Dashboard } from './components/Dashboard'
import { Sidebar } from './components/Sidebar'
import axios from 'axios'

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5"
         style={{ background: 'var(--bg)' }}>
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full"
             style={{ border: '3px solid rgba(30,58,42,0.6)' }} />
        <div className="absolute inset-0 rounded-full animate-spin"
             style={{ border: '3px solid transparent', borderTopColor: '#22c55e' }} />
        <div className="absolute inset-0 flex items-center justify-center text-3xl">⚽</div>
      </div>
      <div className="text-center">
        <p className="font-semibold text-lg" style={{ fontFamily: "'Oswald', sans-serif", color: '#e8f0ec', letterSpacing: '0.08em' }}>
          ŁADOWANIE DANYCH
        </p>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Pobieranie z regionalnyfutbol.pl i 90minut.pl...
        </p>
      </div>
    </div>
  )
}

function ErrorScreen({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4"
         style={{ background: 'var(--bg)' }}>
      <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
           style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
        🚫
      </div>
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold mb-2" style={{ color: '#e8f0ec' }}>
          Błąd pobierania danych
        </h2>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>{error.message}</p>
        <button onClick={onRetry}
          className="px-6 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)', color: '#0f172a' }}>
          Spróbuj ponownie
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const { data, isLoading, error, refetch } = useLeagueData()
  const queryClient = useQueryClient()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [activeSection, setActiveSection] = useState('wszystko')
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await axios.post('/api/refresh')
      await queryClient.invalidateQueries({ queryKey: ['league-data'] })
      await refetch()
    } catch (e) {
      console.error('Refresh failed:', e)
    } finally {
      setIsRefreshing(false)
    }
  }

  if (isLoading) return <Spinner />
  if (error)     return <ErrorScreen error={error as Error} onRetry={() => refetch()} />
  if (!data)     return <Spinner />

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {!isMobile && (
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
      )}
      <div style={{ flex: 1, marginLeft: isMobile ? 0 : 220, minWidth: 0 }}>
        <Dashboard
          data={data}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          activeSection={activeSection}
        />
      </div>
    </div>
  )
}
