import { useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { socket } from '../lib/socket'

/**
 * Manages the socket lifecycle — connects when authenticated, disconnects on logout.
 * Mount this once near the top of the app (AppLayout or similar).
 */
export function useSocketLifecycle() {
  const status = useAuthStore((s) => s.status)
  const wallet = useAuthStore((s) => s.wallet)

  useEffect(() => {
    if (status === 'authenticated' && wallet) {
      // Reconnect with wallet auth so the server knows who we are
      if (socket.connected) socket.disconnect()
      socket.auth = { wallet }
      socket.connect()
    } else if (status === 'idle' && !socket.connected) {
      // Connect without wallet for spectating + world chat
      socket.connect()
    }
  }, [status, wallet])
}