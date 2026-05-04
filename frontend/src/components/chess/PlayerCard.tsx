import Avatar from '../ui/Avatar'
import Timer from './Timer'
import type { Player } from '../../types'

interface PlayerCardProps {
  player: Player
  color: 'white' | 'black'
  timeSeconds: number
  isActive: boolean
  onClickPlayer?: (wallet: string) => void
}

export default function PlayerCard({ player, color, timeSeconds, isActive, onClickPlayer }: PlayerCardProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2 rounded-xl transition-all"
      style={{
        background: isActive ? 'rgba(153,69,255,0.08)' : '#13131a',
        border: `1.5px solid ${isActive ? '#9945FF' : '#2a2a3a'}`,
      }}
    >
      <div className="flex items-center gap-3">
        <Avatar username={player.username} size="md" />
        <div>
          <button
            className="text-sm font-semibold text-white hover:opacity-80 transition-opacity text-left"
            onClick={() => onClickPlayer?.(player.wallet)}
            aria-label={`${player.username}'s profile`}
          >
            {player.username}
          </button>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px]" style={{ color: '#8888aa' }}>
              Trust: {player.trustScore}
            </span>
            <span
              className="w-1 h-1 rounded-full"
              style={{ background: color === 'white' ? '#ffffff' : '#333' }}
            />
            <span className="text-[10px]" style={{ color: '#8888aa' }}>
              {color === 'white' ? '♔' : '♚'}
            </span>
          </div>
        </div>
      </div>

      <Timer initialSeconds={timeSeconds} running={isActive} />
    </div>
  )
}
