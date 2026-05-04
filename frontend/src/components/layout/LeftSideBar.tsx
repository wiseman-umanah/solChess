import Avatar from '../ui/Avatar'
import PlayerStats from '../stats/PlayerStats'
import WorldChat from '../chat/WorldChat'
import { useUserStore } from '../../stores/userStore'
import { useChatStore } from '../../stores/chatStore'

// Mock data for disconnected state
const MOCK_STATS = {
  gamesPlayed: 142,
  gamesWon: 89,
  winRate: 63,
  totalEarnings: 12.4832,
}
const MOCK_TRUST = 78

interface LeftSidebarProps {
  onClickUser?: (wallet: string, username: string) => void
}

export default function LeftSidebar({ onClickUser }: LeftSidebarProps) {
  const { wallet, username, stats, trustScore } = useUserStore()
  const { setActivePrivateChat } = useChatStore()

  const displayUsername = username ?? 'GrandmasterX'
  const displayWallet = wallet ?? 'GmX1...9kPq'
  const displayStats = stats ?? MOCK_STATS
  const displayTrust = trustScore > 0 ? trustScore : MOCK_TRUST

  function handleClickUser(targetWallet: string) {
    setActivePrivateChat(targetWallet)
    onClickUser?.(targetWallet, targetWallet)
  }

  return (
    <aside
      className="fixed top-[60px] left-0 bottom-0 w-[350px] flex flex-col overflow-hidden"
      style={{
        background: 'rgba(19, 19, 26, 0.8)',
        backdropFilter: 'blur(12px)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
      aria-label="Left sidebar"
    >
      {/* Profile section */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid #2a2a3a' }}>
        <div className="flex items-center gap-3">
          <Avatar username={displayUsername} size="lg" online />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{displayUsername}</p>
            <p className="text-[11px] truncate" style={{ color: '#8888aa' }}>{displayWallet}</p>
          </div>
        </div>
      </div>

      {/* Stats section */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid #2a2a3a' }}>
        <PlayerStats stats={displayStats} trustScore={displayTrust} />
      </div>

      {/* World Chat — fills remaining space */}
      <div className="flex-1 px-3 py-3 overflow-hidden flex flex-col min-h-0">
        <WorldChat onClickUser={handleClickUser} />
      </div>
    </aside>
  )
}
