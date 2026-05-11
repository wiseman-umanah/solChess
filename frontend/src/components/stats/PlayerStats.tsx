import TrustScore from './TrustScore'
import StatCard from './StatCard'
import type { PlayerStats as PlayerStatsType } from '../../types'

interface PlayerStatsProps {
  stats: PlayerStatsType
  trustScore: number
}

export default function PlayerStats({ stats, trustScore }: PlayerStatsProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-center py-2">
        <TrustScore score={trustScore} size={84} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard
          label="Games Played"
          value={stats.gamesPlayed}
          offsetColor="purple"
        />
        <StatCard
          label="Games Won"
          value={stats.gamesWon}
          offsetColor="green"
        />
        <StatCard
          label="Win Rate"
          value={`${Number(stats.winRate.toFixed(2))}%`}
          offsetColor="purple"
        />
        <StatCard
          label="Total Earnings"
          value={`${stats.totalEarnings.toFixed(4)} SOL`}
          offsetColor="green"
          gold
        />
      </div>
    </div>
  )
}
