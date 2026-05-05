import { useEffect, useRef } from 'react'
import { useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { useUserStore } from '../stores/userStore'
import { useAuthStore } from '../stores/authStore'
import { authenticate, restoreSession, revokeSession } from '../lib/authService'

export function useWallet() {
  const { publicKey, connected, disconnect, connecting, signMessage } = useSolanaWallet()
  const { connection } = useConnection()
  const { setBalance } = useUserStore()
  const authStatus = useAuthStore((s) => s.status)

  // Track previous connected state to detect transitions
  const prevConnected = useRef(false)

  useEffect(() => {
    const wasConnected = prevConnected.current
    prevConnected.current = connected

    if (connected && publicKey) {
      const wallet = publicKey.toBase58()

      // Fetch on-chain balance
      connection.getBalance(publicKey).then((lamports: number) => {
        setBalance(lamports / LAMPORTS_PER_SOL)
      }).catch(() => setBalance(0))

      // ── Auth on connect ───────────────────────────────────────────────────
      // Only trigger when transitioning from disconnected → connected
      if (!wasConnected) {
        const currentStatus = useAuthStore.getState().status

        // Don't re-trigger if already authenticated/authenticating for this wallet
        if (currentStatus === 'authenticated' && useAuthStore.getState().wallet === wallet) return

        // Try to silently restore session first
        restoreSession(wallet).then((restored) => {
          if (!restored) {
            // No valid session — need wallet signature
            if (signMessage) {
              authenticate(wallet, signMessage)
            }
          }
        })
      }
    } else if (!connected && wasConnected) {
      // ── Revoke on disconnect ──────────────────────────────────────────────
      revokeSession()
    }
  }, [connected, publicKey, connection, setBalance, signMessage])

  // If after the wallet adapter finishes its auto-reconnect attempt the wallet
  // is still not connected, clear any stale tokens.
  useEffect(() => {
    if (!connecting && !connected) {
      const timer = setTimeout(() => {
        if (!useAuthStore.getState().isAuthenticated()) {
          const stored = useAuthStore.getState().getStoredRefresh()
          if (stored) useAuthStore.getState().clearAuth()
        }
      }, 2000) // give wallet adapter 2s to auto-reconnect before cleaning up
      return () => clearTimeout(timer)
    }
  }, [connecting, connected])

  function truncateAddress(address: string): string {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  return {
    connected,
    connecting,
    publicKey,
    disconnect,
    truncateAddress,
    authStatus,
    isAuthenticated: useAuthStore.getState().isAuthenticated(),
  }
}