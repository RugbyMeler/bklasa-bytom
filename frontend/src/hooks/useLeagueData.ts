import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import type { DashboardData } from '../types'

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

async function fetchAll(): Promise<DashboardData> {
  const { data } = await axios.get<DashboardData>(`${API_BASE}/all`)
  return data
}

const FIFTEEN_MIN = 1000 * 60 * 15

export function useLeagueData() {
  return useQuery({
    queryKey: ['league-data'],
    queryFn: fetchAll,
    staleTime: FIFTEEN_MIN,
    refetchInterval: FIFTEEN_MIN,
    refetchIntervalInBackground: false, // only refetch when tab is active
    retry: 2,
  })
}

export function useRefresh() {
  return async () => {
    await axios.post(`${API_BASE}/refresh`)
  }
}
