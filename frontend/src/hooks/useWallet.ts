import { useEffect } from 'react'
import { useWallet as useSolanaWallet, useConnection } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { useUserStore } from '../stores/userStore'

export function useWallet() {
  const { publicKey, connected, disconnect, connecting } = useSolanaWallet()
  const { connection } = useConnection()
  const { setWallet, setBalance, disconnect: storeDisconnect } = useUserStore()

  useEffect(() => {
    if (connected && publicKey) {
      const address = publicKey.toBase58()
      setWallet(address)

      connection.getBalance(publicKey).then((lamports) => {
        setBalance(lamports / LAMPORTS_PER_SOL)
      }).catch(() => {
        setBalance(0)
      })
    } else if (!connected) {
      storeDisconnect()
    }
  }, [connected, publicKey, connection, setWallet, setBalance, storeDisconnect])

  function truncateAddress(address: string): string {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  return {
    connected,
    connecting,
    publicKey,
    disconnect,
    truncateAddress,
  }
}
