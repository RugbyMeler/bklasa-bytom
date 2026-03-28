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

export function useLeagueData() {
  return useQuery({
    queryKey: ['league-data'],
    queryFn: fetchAll,
    staleTime: 1000 * 60 * 10, // 10 minutes
    retry: 2,
  })
}

export function useRefresh() {
  return async () => {
    await axios.post(`${API_BASE}/refresh`)
  }
}
