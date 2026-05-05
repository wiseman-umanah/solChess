import { useEffect, useState } from 'react'
import { api } from '../lib/apiClient'

export interface LeaderboardEntry {
  rank: number
  wallet: string
  username: string | null
  trustScore: number
  stats: {
    gamesPlayed: number
    gamesWon: number
    winRate: number
    totalEarnings: number
  } | null
}

export function useLeaderboard(limit = 100) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api.get<LeaderboardEntry[]>(`/api/v1/leaderboard?limit=${limit}`)
      .then((data) => { if (!cancelled) { setEntries(data); setLoading(false) } })
      .catch(() => { if (!cancelled) { setError('Failed to load leaderboard'); setLoading(false) } })
    return () => { cancelled = true }
  }, [limit])

  return { entries, loading, error }
}