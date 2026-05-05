import { create } from 'zustand'

export type AuthStatus =
  | 'idle'           // no wallet
  | 'restoring'      // checking localStorage on page load
  | 'signing'        // waiting for wallet signature
  | 'authenticating' // verifying with backend
  | 'authenticated'  // all good
  | 'refreshing'     // getting new access token silently
  | 'error'          // unrecoverable — user needs to re-sign

const LS_REFRESH = 'solchess_refresh_token'
const LS_WALLET  = 'solchess_wallet'

interface AuthState {
  status: AuthStatus
  accessToken: string | null
  expiresAt: number | null     // ms timestamp
  wallet: string | null
  error: string | null
  _refreshTimer: ReturnType<typeof setTimeout> | null

  // Actions
  setTokens: (accessToken: string, expiresIn: number, wallet: string, refreshToken: string) => void
  setStatus: (status: AuthStatus) => void
  setError: (error: string) => void
  clearAuth: () => void

  // Selectors
  isAuthenticated: () => boolean
  isExpiringSoon: () => boolean
  getStoredRefresh: () => { token: string; wallet: string } | null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status:        'idle',
  accessToken:   null,
  expiresAt:     null,
  wallet:        null,
  error:         null,
  _refreshTimer: null,

  setTokens(accessToken, expiresIn, wallet, refreshToken) {
    const expiresAt = Date.now() + expiresIn * 1000

    // Persist refresh token
    localStorage.setItem(LS_REFRESH, refreshToken)
    localStorage.setItem(LS_WALLET, wallet)

    // Clear existing timer
    const prev = get()._refreshTimer
    if (prev) clearTimeout(prev)

    // Schedule proactive refresh 2 min before expiry
    const delay = Math.max(0, expiresAt - Date.now() - 2 * 60 * 1000)
    const timer = setTimeout(() => {
      // Import lazily to avoid circular dep — authService reads the store
      import('../lib/authService').then(({ refreshSession }) => refreshSession())
    }, delay)

    set({ status: 'authenticated', accessToken, expiresAt, wallet, error: null, _refreshTimer: timer })
  },

  setStatus: (status) => set({ status }),

  setError: (error) => set({ status: 'error', error }),

  clearAuth() {
    const prev = get()._refreshTimer
    if (prev) clearTimeout(prev)
    localStorage.removeItem(LS_REFRESH)
    localStorage.removeItem(LS_WALLET)
    set({ status: 'idle', accessToken: null, expiresAt: null, wallet: null, error: null, _refreshTimer: null })
  },

  isAuthenticated: () => {
    const { status, accessToken, expiresAt } = get()
    return status === 'authenticated' && !!accessToken && !!expiresAt && Date.now() < expiresAt
  },

  isExpiringSoon: () => {
    const { expiresAt } = get()
    return !!expiresAt && (expiresAt - Date.now()) < 2 * 60 * 1000
  },

  getStoredRefresh: () => {
    const token  = localStorage.getItem(LS_REFRESH)
    const wallet = localStorage.getItem(LS_WALLET)
    if (!token || !wallet) return null
    return { token, wallet }
  },
}))