import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '../../hooks/useWallet'
import { useUserStore } from '../../stores/userStore'
import Avatar from '../ui/Avatar'

export default function ConnectButton() {
  const { connected, connecting, disconnect, truncateAddress } = useWallet()
  const { setVisible } = useWalletModal()
  const { wallet, balance } = useUserStore()

  if (connecting) {
    return (
      <div
        className="flex items-center gap-2 px-4 py-1.5 rounded-[8px] text-sm font-semibold"
        style={{ background: '#13131a', border: '1.5px solid #2a2a3a', color: '#8888aa' }}
      >
        Connecting...
      </div>
    )
  }

  if (connected && wallet) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs font-medium" style={{ color: '#14F195' }}>
          {balance.toFixed(4)} SOL
        </span>
        <div className="flex items-center gap-2">
          <Avatar username={wallet} size="sm" />
          <span className="text-xs font-medium text-white">{truncateAddress(wallet)}</span>
        </div>
        <button
          onClick={disconnect}
          className="text-[10px] px-2 py-1 rounded-md hover:opacity-80 transition-opacity"
          style={{ color: '#8888aa', border: '1px solid #2a2a3a' }}
          aria-label="Disconnect wallet"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <div className="relative inline-block">
      {/* Offset layer */}
      <div
        className="absolute w-full h-full"
        style={{ top: 4, left: 4, background: 'linear-gradient(135deg, #9945FF, #14F195)', zIndex: 0 }}
      />
      <button
        onClick={() => setVisible(true)}
        className="relative z-10 px-5 py-1.5 text-sm font-semibold text-white transition-transform active:translate-x-[3px] active:translate-y-[3px]"
        style={{ background: '#13131a', border: '1.5px solid #2a2a3a' }}
        aria-label="Connect wallet"
      >
        Connect Wallet
      </button>
    </div>
  )
}
