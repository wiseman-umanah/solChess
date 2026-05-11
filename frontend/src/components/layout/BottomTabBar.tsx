import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import PlayerStats from '../stats/PlayerStats'
import WorldChat from '../chat/WorldChat'
import PrivateChat from '../chat/PrivateChat'
import CreateModal from '../modals/CreateModal'
import JoinModal from '../modals/JoinModal'
import PracticeAIModal from '../modals/PracticeAIModal'
import PracticeFriendModal from '../modals/PracticeFriendModal'
import { useAuthStore } from '../../stores/authStore'
import { useUserStore } from '../../stores/userStore'
import { useChatStore } from '../../stores/chatStore'

type Tab = 'play' | 'chat' | 'stats' | null
type ModalState = 'create' | 'join' | 'host' | 'practiceAI' | 'friend' | null

const MOCK_STATS = {
  gamesPlayed: 142,
  gamesWon: 89,
  winRate: 63,
  totalEarnings: 12.4832,
}
const MOCK_TRUST = 78

interface BottomTabBarProps {
  activePrivateChat?: string | null
  activeChatUsername?: string | null
  onClickUser?: (wallet: string, username: string) => void
}

export default function BottomTabBar({ activePrivateChat, activeChatUsername, onClickUser }: BottomTabBarProps) {
  const [activeTab, setActiveTab] = useState<Tab>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { setVisible } = useWalletModal()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  const { stats, trustScore } = useUserStore()
  const { setActivePrivateChat } = useChatStore()

  const displayStats = stats ?? MOCK_STATS
  const displayTrust = trustScore > 0 ? trustScore : MOCK_TRUST

  function requireAuth(action: () => void) {
    if (!isAuthenticated) { setVisible(true); return }
    action()
  }

  function toggleTab(tab: Tab) {
    setActiveTab(prev => prev === tab ? null : tab)
  }

  function handleClickUser(wallet: string, username: string) {
    setActivePrivateChat(wallet)
    onClickUser?.(wallet, username)
  }

  const tabStyle = (tab: Tab) => ({
    color: activeTab === tab ? '#9945FF' : '#8888aa',
  })

  return (
    <>
      {/* Slide-up panel */}
      {activeTab && (
        <div
          className="fixed bottom-[60px] left-0 right-0 z-40 flex flex-col overflow-hidden"
          style={{
            background: 'rgba(19,19,26,0.98)',
            backdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            maxHeight: 'calc(100vh - 120px)',
          }}
        >
          {/* Panel header */}
          <div
            className="flex items-center justify-between px-4 py-3 flex-shrink-0"
            style={{ borderBottom: '1px solid #2a2a3a' }}
          >
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
              {activeTab === 'play' && 'Play'}
              {activeTab === 'chat' && 'Chat'}
              {activeTab === 'stats' && 'My Stats'}
            </span>
            <button onClick={() => setActiveTab(null)} className="text-sm" style={{ color: '#8888aa' }}>✕</button>
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto">

            {/* PLAY tab */}
            {activeTab === 'play' && (
              <div className="p-4 grid grid-cols-2 gap-3">
                {[
                  { label: 'Create Game', icon: '♟', color: '#9945FF', action: () => { requireAuth(() => { setModal('create'); setActiveTab(null) }) } },
                  { label: 'Join Game',   icon: '→',  color: '#14F195', action: () => { requireAuth(() => { setModal('join');   setActiveTab(null) }) } },
                  { label: 'Host Event', icon: '⬡',  color: '#9945FF', action: () => { requireAuth(() => { setModal('host');   setActiveTab(null) }) } },
                  { label: 'Puzzles',    icon: '◈',  color: '#14F195', action: () => { navigate('/puzzles'); setActiveTab(null) } },
                  { label: 'vs AI',      icon: '⚙',  color: '#9945FF', action: () => { setModal('practiceAI'); setActiveTab(null) } },
                  { label: 'vs Friend',  icon: '♥',  color: '#14F195', action: () => { requireAuth(() => { setModal('friend'); setActiveTab(null) }) } },
                ].map(({ label, icon, color, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="flex flex-col items-center justify-center gap-2 py-4 rounded-xl text-white font-medium text-sm transition-all active:scale-95"
                    style={{ background: '#13131a', border: `1px solid ${color}33` }}
                  >
                    <span className="text-xl">{icon}</span>
                    <span style={{ color }}>{label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* CHAT tab */}
            {activeTab === 'chat' && (
              <div className="flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
                {/* Private chat */}
                <div className="px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid #2a2a3a' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#8888aa' }}>Private Chat</p>
                  <div style={{ height: 120, overflow: 'hidden' }}>
                    <PrivateChat
                      targetWallet={activePrivateChat ?? undefined}
                      targetUsername={activeChatUsername ?? undefined}
                    />
                  </div>
                </div>
                {/* World chat */}
                <div className="flex-1 px-3 py-3 overflow-hidden flex flex-col min-h-0">
                  <WorldChat onClickUser={(w) => handleClickUser(w, w)} />
                </div>
              </div>
            )}


{/* STATS tab */}
            {activeTab === 'stats' && (
              <div className="px-4 py-4">
                <PlayerStats stats={displayStats} trustScore={displayTrust} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 h-[60px] flex items-center z-50"
        style={{
          background: 'rgba(10,10,15,0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
        aria-label="Mobile navigation"
      >
        {/* Home */}
        <button
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2"
          style={{ color: pathname === '/' && activeTab === null ? '#14F195' : '#8888aa' }}
          onClick={() => { setActiveTab(null); navigate('/') }}
          aria-label="Home"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" />
            <path d="M9 21V12h6v9" />
          </svg>
          <span className="text-[10px] font-medium">Home</span>
        </button>

        {/* Play */}
        <button
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2"
          style={tabStyle('play')}
          onClick={() => toggleTab('play')}
          aria-label="Play"
        >
          <span className="text-lg leading-none">♟</span>
          <span className="text-[10px] font-medium">Play</span>
        </button>

        {/* Chat */}
        <button
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2"
          style={tabStyle('chat')}
          onClick={() => toggleTab('chat')}
          aria-label="Chat"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
          <span className="text-[10px] font-medium">Chat</span>
        </button>

        {/* Games */}
        <button
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2"
          style={{ color: '#8888aa' }}
          onClick={() => { setActiveTab(null); navigate('/games') }}
          aria-label="Live Games"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
          </svg>
          <span className="text-[10px] font-medium">Live</span>
        </button>

        {/* Stats */}
        <button
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2"
          style={tabStyle('stats')}
          onClick={() => toggleTab('stats')}
          aria-label="My Stats"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          <span className="text-[10px] font-medium">Stats</span>
        </button>
      </nav>

      {/* Modals */}
      <CreateModal open={modal === 'create'} mode="create" onClose={() => setModal(null)} />
      <CreateModal open={modal === 'host'} mode="host" onClose={() => setModal(null)} />
      <JoinModal open={modal === 'join'} onClose={() => setModal(null)} />
      <PracticeAIModal open={modal === 'practiceAI'} onClose={() => setModal(null)} />
      <PracticeFriendModal open={modal === 'friend'} onClose={() => setModal(null)} />
    </>
  )
}
