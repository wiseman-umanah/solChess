import DoubleCard from '../components/ui/DoubleCard'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import TrustScore from '../components/stats/TrustScore'

interface Entry {
  rank: number
  username: string
  wallet: string
  trustScore: number
  gamesWon: number
  gamesPlayed: number
  earnings: number
}

const MOCK: Entry[] = [
  { rank: 1, username: 'GrandmasterX', wallet: 'GmX1...9kPq', trustScore: 98, gamesWon: 312, gamesPlayed: 380, earnings: 48.32 },
  { rank: 2, username: 'SolKnight', wallet: 'SoK2...3mRt', trustScore: 95, gamesWon: 280, gamesPlayed: 350, earnings: 31.21 },
  { rank: 3, username: 'ZeroLatency', wallet: 'ZeL3...8pQz', trustScore: 91, gamesWon: 210, gamesPlayed: 290, earnings: 22.50 },
  { rank: 4, username: 'CryptoKing', wallet: 'CrK4...2nBv', trustScore: 88, gamesWon: 189, gamesPlayed: 260, earnings: 18.01 },
  { rank: 5, username: 'BlockPawn', wallet: 'BlP5...7mCx', trustScore: 85, gamesWon: 170, gamesPlayed: 240, earnings: 14.75 },
  { rank: 6, username: 'ByteBishop', wallet: 'ByB6...1kDz', trustScore: 82, gamesWon: 155, gamesPlayed: 220, earnings: 11.22 },
  { rank: 7, username: 'HashKnight', wallet: 'HaK7...3pEw', trustScore: 79, gamesWon: 140, gamesPlayed: 200, earnings: 9.44 },
  { rank: 8, username: 'LedgerQueen', wallet: 'LeQ8...6nFv', trustScore: 77, gamesWon: 130, gamesPlayed: 190, earnings: 8.10 },
]

const RANK_STYLES: Record<number, { color: string; label: string }> = {
  1: { color: '#FFD700', label: '🥇' },
  2: { color: '#C0C0C0', label: '🥈' },
  3: { color: '#CD7F32', label: '🥉' },
}

export default function LeaderboardPage() {
  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Leaderboard</h1>
        <p className="text-sm" style={{ color: '#8888aa' }}>
          Top players ranked by trust score
        </p>
      </div>

      {/* Top 3 podium */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {MOCK.slice(0, 3).map((entry) => (
          <DoubleCard key={entry.rank} offsetColor={entry.rank === 1 ? 'purple' : 'green'}>
            <div className="p-4 flex flex-col items-center gap-2 text-center">
              <span className="text-2xl">{RANK_STYLES[entry.rank].label}</span>
              <Avatar username={entry.username} size="lg" gradientBorder />
              <p className="text-sm font-semibold text-white">{entry.username}</p>
              <TrustScore score={entry.trustScore} size={64} />
              <p className="text-xs" style={{ color: '#FFD700' }}>
                {entry.earnings.toFixed(4)} SOL
              </p>
            </div>
          </DoubleCard>
        ))}
      </div>

      {/* Full table */}
      <div
        className=" overflow-hidden"
        style={{ border: '1.5px solid #2a2a3a' }}
      >
        <table className="w-full">
          <thead>
            <tr style={{ background: '#13131a', borderBottom: '1px solid #2a2a3a' }}>
              {['Rank', 'Player', 'Trust', 'W/L', 'Earnings'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: '#8888aa' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MOCK.map((entry, i) => (
              <tr
                key={entry.rank}
                style={{
                  background: i % 2 === 0 ? '#13131a' : '#0f0f16',
                  borderBottom: '1px solid #2a2a3a',
                }}
              >
                <td className="px-4 py-3">
                  <span
                    className="text-sm font-bold"
                    style={{ color: RANK_STYLES[entry.rank]?.color ?? '#8888aa' }}
                  >
                    {RANK_STYLES[entry.rank]?.label ?? `#${entry.rank}`}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar username={entry.username} size="sm" />
                    <div>
                      <p className="text-xs font-semibold text-white">{entry.username}</p>
                      <p className="text-[10px]" style={{ color: '#8888aa' }}>{entry.wallet}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="purple">{entry.trustScore}</Badge>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-white">
                    {entry.gamesWon}
                    <span style={{ color: '#8888aa' }}>/{entry.gamesPlayed}</span>
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-semibold" style={{ color: '#FFD700' }}>
                    {entry.earnings.toFixed(4)} SOL
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
