import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useLeagueData } from './hooks/useLeagueData'
import { Dashboard } from './components/Dashboard'
import axios from 'axios'

function Spinner() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-5"
         style={{ background: 'var(--bg)' }}>
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full"
             style={{ border: '3px solid rgba(45,74,99,0.5)' }} />
        <div className="absolute inset-0 rounded-full animate-spin"
             style={{ border: '3px solid transparent', borderTopColor: '#4ade80' }} />
        <div className="absolute inset-0 flex items-center justify-center text-3xl">⚽</div>
      </div>
      <div className="text-center">
        <p className="font-semibold text-lg" style={{ fontFamily: "'Oswald', sans-serif", color: '#f8fafc', letterSpacing: '0.05em' }}>
          ŁADOWANIE DANYCH
        </p>
        <p className="text-sm mt-1" style={{ color: '#64748b' }}>
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
           style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}>
        🚫
      </div>
      <div className="text-center max-w-md">
        <h2 className="text-xl font-semibold mb-2" style={{ color: '#f8fafc' }}>
          Błąd pobierania danych
        </h2>
        <p className="text-sm mb-4" style={{ color: '#94a3b8' }}>{error.message}</p>
        <p className="text-xs mb-6" style={{ color: '#64748b' }}>
          Upewnij się, że backend API jest uruchomiony na porcie 8000.<br />
          Uruchom:{' '}
          <code className="px-2 py-0.5 rounded text-xs"
                style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>
            uvicorn main:app --reload
          </code>
        </p>
        <button onClick={onRetry}
          className="px-6 py-2 rounded-lg text-sm font-semibold transition-all"
          style={{ background: 'linear-gradient(135deg, #16a34a, #4ade80)', color: '#0f172a' }}>
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

  return <Dashboard data={data} onRefresh={handleRefresh} isRefreshing={isRefreshing} />
}
