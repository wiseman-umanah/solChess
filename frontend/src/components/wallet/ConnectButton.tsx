import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '../../hooks/useWallet'
import { useUserStore } from '../../stores/userStore'
import Avatar from '../ui/Avatar'
import { useState, useRef, useEffect } from 'react'

function ProfileDropdown({
  balance,
  onDisconnect,
  onClose,
}: {
  balance: number
  onDisconnect: () => void
  onClose: () => void
}) {
  const { username, setUsername } = useUserStore()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(username ?? '')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  function saveUsername() {
    const trimmed = draft.trim()
    if (trimmed) setUsername(trimmed)
    setEditing(false)
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 w-[220px] z-50 flex flex-col overflow-hidden"
      style={{ background: '#13131a', border: '1.5px solid #2a2a3a', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
    >
      {/* Balance */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid #2a2a3a' }}>
        <p className="text-[9px] uppercase tracking-widest mb-0.5" style={{ color: '#55556a' }}>Balance</p>
        <p className="text-lg font-bold font-mono" style={{ color: '#14F195' }}>
          {balance.toFixed(4)}
          <span className="text-xs ml-1" style={{ color: '#8888aa' }}>SOL</span>
        </p>
      </div>

      {/* Edit Username */}
      <div className="px-4 py-3" style={{ borderBottom: '1px solid #2a2a3a' }}>
        <p className="text-[9px] uppercase tracking-widest mb-1.5" style={{ color: '#55556a' }}>Username</p>
        {editing ? (
          <div className="flex gap-1.5">
            <input
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') saveUsername(); if (e.key === 'Escape') setEditing(false) }}
              className="flex-1 px-2 py-1 text-xs bg-transparent outline-none"
              style={{ border: '1px solid #9945FF', color: '#ffffff' }}
              maxLength={24}
            />
            <button
              onClick={saveUsername}
              className="px-2 py-1 text-[9px] font-bold"
              style={{ background: 'rgba(153,69,255,0.15)', color: '#9945FF', border: '1px solid #9945FF' }}
            >
              Save
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setDraft(username ?? ''); setEditing(true) }}
            className="flex items-center gap-2 w-full text-left hover:opacity-80 transition-opacity"
          >
            <span className="text-sm text-white">{username || 'Set username'}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="ml-auto flex-shrink-0">
              <path d="M7 1L9 3L3.5 8.5L1 9L1.5 6.5L7 1Z" stroke="#8888aa" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          </button>
        )}
      </div>

      {/* Chats */}
      <button
        onClick={onClose}
        className="flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-white/[0.03] transition-colors"
        style={{ borderBottom: '1px solid #2a2a3a', color: '#cccccc' }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 2h10v8H8l-3 2V10H2V2Z" stroke="#8888aa" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
        Chats
      </button>

      {/* Disconnect */}
      <button
        onClick={() => { onDisconnect(); onClose() }}
        className="flex items-center gap-3 px-4 py-3 text-sm text-left hover:bg-white/[0.03] transition-colors"
        style={{ color: '#FF3B30' }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M5 2H2v10h3M9 4l3 3-3 3M12 7H6" stroke="#FF3B30" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Disconnect
      </button>
    </div>
  )
}

export default function ConnectButton() {
  const { connected, connecting, disconnect, truncateAddress } = useWallet()
  const { setVisible } = useWalletModal()
  const { wallet, balance } = useUserStore()
  const [open, setOpen] = useState(false)

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
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 px-3 py-1.5 transition-all hover:opacity-90"
          style={{ background: '#13131a', border: '1.5px solid #2a2a3a' }}
        >
          <Avatar username={wallet} size="sm" />
          <span className="text-xs font-medium text-white">{truncateAddress(wallet)}</span>
          <svg
            width="10" height="10" viewBox="0 0 10 10" fill="none"
            className="transition-transform duration-150"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            <path d="M2 3.5L5 6.5L8 3.5" stroke="#8888aa" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {open && (
          <ProfileDropdown
            balance={balance}
            onDisconnect={disconnect}
            onClose={() => setOpen(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="relative inline-block">
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