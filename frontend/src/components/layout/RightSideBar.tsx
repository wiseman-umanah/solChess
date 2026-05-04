import { Link } from 'react-router-dom'
import PrivateChat from '../chat/PrivateChat'
import LiveIndicator from '../ui/LiveIndicator'
import Avatar from '../ui/Avatar'
import type { LiveGame, LeaderboardEntry } from '../../types'

const MOCK_LIVE_GAMES: LiveGame[] = [
  { id: '1', whiteName: 'GrandmasterX', blackName: 'SolKnight', prizePool: 2.5, spectatorCount: 34, timeControl: 5 },
  { id: '2', whiteName: 'ChainPawn', blackName: 'BlockRook', prizePool: 1.0, spectatorCount: 12, timeControl: 3 },
  { id: '3', whiteName: 'ZeroLatency', blackName: 'CryptoKing', prizePool: 5.0, spectatorCount: 89, timeControl: 10 },
]

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, wallet: 'Gm1x...', username: 'GrandmasterX', trustScore: 98 },
  { rank: 2, wallet: 'Sk2x...', username: 'SolKnight', trustScore: 95 },
  { rank: 3, wallet: 'Ze3x...', username: 'ZeroLatency', trustScore: 91 },
  { rank: 4, wallet: 'Ck4x...', username: 'CryptoKing', trustScore: 88 },
  { rank: 5, wallet: 'Bp5x...', username: 'BlockPawn', trustScore: 85 },
]

interface RightSidebarProps {
  activePrivateChat?: string | null
  activeChatUsername?: string | null
}

export default function RightSidebar({ activePrivateChat, activeChatUsername }: RightSidebarProps) {
  return (
    <aside
      className="fixed top-[60px] right-0 bottom-0 w-[350px] flex flex-col overflow-hidden"
      style={{
        background: 'rgba(19, 19, 26, 0.8)',
        backdropFilter: 'blur(12px)',
        borderLeft: '1px solid rgba(255,255,255,0.06)',
      }}
      aria-label="Right sidebar"
    >
      {/* Private Chat */}
      <div
        className="px-4 py-4 flex flex-col"
        style={{ borderBottom: '1px solid #2a2a3a', minHeight: activePrivateChat ? '220px' : '100px', maxHeight: '240px' }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#8888aa' }}>
          Private Chat
        </p>
        <div className="flex-1 overflow-hidden">
          <PrivateChat
            targetWallet={activePrivateChat ?? undefined}
            targetUsername={activeChatUsername ?? undefined}
          />
        </div>
      </div>

      {/* Live Games */}
      <div className="px-4 py-4 flex-1 overflow-y-auto" style={{ borderBottom: '1px solid #2a2a3a' }}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
            Live Games
          </p>
          <LiveIndicator size="sm" showText={false} />
        </div>

        <div className="space-y-2">
          {MOCK_LIVE_GAMES.map((game) => (
            <Link
              key={game.id}
              to={`/game/${game.id}`}
              className="block p-2.5 transition-all hover:border-purple-500/50"
              style={{ background: '#0a0a0f', border: '1px solid #2a2a3a' }}
              aria-label={`Spectate ${game.whiteName} vs ${game.blackName}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-white truncate">
                  {game.whiteName} vs {game.blackName}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px]" style={{ color: '#FFD700' }}>
                  {game.prizePool.toFixed(4)} SOL
                </span>
                <span className="text-[10px]" style={{ color: '#8888aa' }}>
                  {game.spectatorCount} watching
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Mini Leaderboard */}
      <div className="px-4 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#8888aa' }}>
          Top Players
        </p>
        <div className="space-y-2">
          {MOCK_LEADERBOARD.map((entry) => (
            <div key={entry.rank} className="flex items-center gap-2">
              <span
                className="w-4 text-right text-[10px] font-bold flex-shrink-0"
                style={{ color: entry.rank === 1 ? '#FFD700' : entry.rank === 2 ? '#C0C0C0' : entry.rank === 3 ? '#CD7F32' : '#8888aa' }}
              >
                {entry.rank}
              </span>
              <Avatar username={entry.username} size="sm" />
              <span className="text-xs text-white flex-1 truncate">{entry.username}</span>
              <span className="text-[10px] font-semibold flex-shrink-0" style={{ color: '#9945FF' }}>
                {entry.trustScore}
              </span>
            </div>
          ))}
        </div>
        <Link
          to="/leaderboard"
          className="block text-center text-[11px] mt-3 hover:opacity-80 transition-opacity"
          style={{ color: '#9945FF' }}
        >
          View full leaderboard →
        </Link>
      </div>
    </aside>
  )
}
