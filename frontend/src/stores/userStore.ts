import { create } from 'zustand'
import type { PlayerStats } from '../types'

interface UserState {
  wallet: string | null
  balance: number
  username: string | null
  stats: PlayerStats | null
  trustScore: number

  setWallet: (wallet: string | null) => void
  setBalance: (balance: number) => void
  setUsername: (username: string) => void
  setStats: (stats: PlayerStats) => void
  setTrustScore: (score: number) => void
  disconnect: () => void
}

export const useUserStore = create<UserState>((set) => ({
  wallet: null,
  balance: 0,
  username: null,
  stats: null,
  trustScore: 0,

  setWallet: (wallet) => set({ wallet }),
  setBalance: (balance) => set({ balance }),
  setUsername: (username) => set({ username }),
  setStats: (stats) => set({ stats }),
  setTrustScore: (trustScore) => set({ trustScore }),

  disconnect: () =>
    set({ wallet: null, balance: 0, username: null, stats: null, trustScore: 0 }),
}))
