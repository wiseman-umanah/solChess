import bs58 from 'bs58'
import { useAuthStore } from '../stores/authStore'
import { useUserStore } from '../stores/userStore'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

interface TokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

// Raw fetch for auth endpoints — no interceptor (avoids circular dep)
async function authFetch<T>(path: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    if (res.status === 204) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}

/**
 * Full sign-in flow: challenge → wallet signs → verify → store tokens.
 * Call this when the wallet just connected and no valid session exists.
 */
export async function authenticate(
  wallet: string,
  signMessage: (msg: Uint8Array) => Promise<Uint8Array>,
): Promise<boolean> {
  const store = useAuthStore.getState()
  store.setStatus('signing')

  try {
    // 1. Get challenge nonce
    const challengeRes = await authFetch<{ nonce: string }>(
      '/api/v1/auth/challenge',
      { wallet },
    )
    if (!challengeRes) {
      store.setError('Could not reach server. Try again.')
      return false
    }

    // 2. Sign the nonce with the wallet
    const message = new TextEncoder().encode(challengeRes.nonce)
    let signatureBytes: Uint8Array
    try {
      signatureBytes = await signMessage(message)
    } catch {
      // User rejected the signature request
      store.setStatus('idle')
      return false
    }

    const signature = bs58.encode(signatureBytes)

    store.setStatus('authenticating')

    // 3. Verify with backend → get tokens
    const tokenRes = await authFetch<TokenResponse>('/api/v1/auth/verify', { wallet, signature })
    if (!tokenRes) {
      store.setError('Authentication failed. Please try again.')
      return false
    }

    store.setTokens(tokenRes.accessToken, tokenRes.expiresIn, wallet, tokenRes.refreshToken)

    // 4. Hydrate user profile into userStore
    await hydrateProfile(wallet, tokenRes.accessToken)

    return true
  } catch {
    store.setError('Unexpected error during authentication.')
    return false
  }
}

/**
 * Silently restore session using stored refresh token.
 * Call this on page load or when wallet reconnects.
 * Returns true if session was restored, false if full re-auth is needed.
 */
export async function restoreSession(wallet: string): Promise<boolean> {
  const store = useAuthStore.getState()
  const stored = store.getStoredRefresh()

  // Stored session belongs to a different wallet — don't restore
  if (!stored || stored.wallet !== wallet) return false

  store.setStatus('restoring')

  const tokenRes = await authFetch<TokenResponse>('/api/v1/auth/refresh', {
    refreshToken: stored.token,
  })

  if (!tokenRes) {
    // Refresh token invalid/expired — clear stale data
    store.clearAuth()
    return false
  }

  store.setTokens(tokenRes.accessToken, tokenRes.expiresIn, wallet, tokenRes.refreshToken)
  await hydrateProfile(wallet, tokenRes.accessToken)
  return true
}

/**
 * Exchange current refresh token for a new access token.
 * Called proactively before expiry and reactively on 401.
 */
export async function refreshSession(): Promise<boolean> {
  const store = useAuthStore.getState()
  const stored = store.getStoredRefresh()
  if (!stored) return false

  store.setStatus('refreshing')

  const tokenRes = await authFetch<TokenResponse>('/api/v1/auth/refresh', {
    refreshToken: stored.token,
  })

  if (!tokenRes) {
    store.clearAuth()
    return false
  }

  store.setTokens(
    tokenRes.accessToken,
    tokenRes.expiresIn,
    store.wallet ?? stored.wallet,
    tokenRes.refreshToken,
  )
  return true
}

/**
 * Revoke session: tell backend to invalidate the refresh token, then clear local state.
 * Call this on wallet disconnect.
 */
export async function revokeSession(): Promise<void> {
  const stored = useAuthStore.getState().getStoredRefresh()

  if (stored) {
    // Fire-and-forget — don't block wallet disconnect on network
    authFetch('/api/v1/auth/logout', { refreshToken: stored.token }).catch(() => {})
  }

  useAuthStore.getState().clearAuth()
  useUserStore.getState().disconnect()
}

/**
 * Load the user profile from the backend and populate userStore.
 */
async function hydrateProfile(wallet: string, accessToken: string) {
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:3001'}/api/v1/users/${wallet}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) return
    const user = await res.json()
    const us = useUserStore.getState()
    us.setWallet(user.wallet)
    if (user.username) us.setUsername(user.username)
    if (user.stats) us.setStats(user.stats)
    if (user.trustScore !== undefined) us.setTrustScore(user.trustScore)
  } catch {
    // Non-fatal — profile will load eventually
  }
}