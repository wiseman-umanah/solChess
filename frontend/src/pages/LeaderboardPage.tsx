import SEO from '../components/SEO'
import DoubleCard from '../components/ui/DoubleCard'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import TrustScore from '../components/stats/TrustScore'
import { useLeaderboard } from '../hooks/useLeaderboard'

const RANK_STYLES: Record<number, { color: string; label: string }> = {
  1: { color: '#FFD700', label: '🥇' },
  2: { color: '#C0C0C0', label: '🥈' },
  3: { color: '#CD7F32', label: '🥉' },
}

function displayName(entry: { username: string | null; wallet: string }) {
  return entry.username ?? `${entry.wallet.slice(0, 4)}...${entry.wallet.slice(-4)}`
}

export default function LeaderboardPage() {
  const { entries, loading, error } = useLeaderboard(100)

  return (
    <div className="px-6 py-8 max-w-3xl mx-auto">
      <SEO
        title="Leaderboard — Top SolChess Players"
        description="See the top chess players on SolChess ranked by wins, earnings, and trust score. All stats are on-chain verified."
        url="https://sol-chess-nine.vercel.app/leaderboard"
      />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Leaderboard</h1>
        <p className="text-sm" style={{ color: '#8888aa' }}>Top players ranked by trust score</p>
      </div>

      {loading && (
        <p className="text-sm text-center py-12" style={{ color: '#8888aa' }}>Loading…</p>
      )}

      {error && (
        <p className="text-sm text-center py-12" style={{ color: '#FF3B30' }}>{error}</p>
      )}

      {!loading && !error && entries.length === 0 && (
        <p className="text-sm text-center py-12" style={{ color: '#8888aa' }}>No players yet. Be the first!</p>
      )}

      {!loading && !error && entries.length > 0 && (
        <>
          {/* Top 3 podium */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {entries.slice(0, 3).map((entry) => (
              <DoubleCard key={entry.rank} offsetColor={entry.rank === 1 ? 'purple' : 'green'}>
                <div className="p-4 flex flex-col items-center gap-2 text-center">
                  <span className="text-2xl">{RANK_STYLES[entry.rank].label}</span>
                  <Avatar username={displayName(entry)} size="lg" gradientBorder />
                  <p className="text-sm font-semibold text-white">{displayName(entry)}</p>
                  <TrustScore score={entry.trustScore} size={64} />
                  <p className="text-xs" style={{ color: '#FFD700' }}>
                    {(entry.stats?.totalEarnings ?? 0).toFixed(4)} SOL
                  </p>
                </div>
              </DoubleCard>
            ))}
          </div>

          {/* Full table */}
          <div className="overflow-hidden" style={{ border: '1.5px solid #2a2a3a' }}>
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
                {entries.map((entry, i) => (
                  <tr
                    key={entry.wallet}
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
                        <Avatar username={displayName(entry)} size="sm" />
                        <div>
                          <p className="text-xs font-semibold text-white">{displayName(entry)}</p>
                          <p className="text-[10px]" style={{ color: '#8888aa' }}>
                            {entry.wallet.slice(0, 4)}…{entry.wallet.slice(-4)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="purple">{entry.trustScore}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-white">
                        {entry.stats?.gamesWon ?? 0}
                        <span style={{ color: '#8888aa' }}>/{entry.stats?.gamesPlayed ?? 0}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold" style={{ color: '#FFD700' }}>
                        {(entry.stats?.totalEarnings ?? 0).toFixed(4)} SOL
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}