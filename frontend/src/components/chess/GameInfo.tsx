import LiveIndicator from '../ui/LiveIndicator'

interface GameInfoProps {
  prizePool: number
  stakesWhite: number
  stakesBlack: number
  spectatorCount: number
}

export default function GameInfo({ prizePool, stakesWhite, stakesBlack, spectatorCount }: GameInfoProps) {
  return (
    <div
      className="flex items-center justify-between px-4 py-2 rounded-xl"
      style={{ background: '#13131a', border: '1.5px solid #2a2a3a' }}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium" style={{ color: '#8888aa' }}>Prize Pool</span>
        <span className="text-base font-bold" style={{ color: '#FFD700' }}>
          {prizePool.toFixed(4)} SOL
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <span style={{ color: '#ffffff' }}>♔ {stakesWhite.toFixed(4)}</span>
        <span style={{ color: '#8888aa' }}>vs</span>
        <span style={{ color: '#8888aa' }}>♚ {stakesBlack.toFixed(4)}</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1" style={{ color: '#8888aa' }}>
          <span>👁</span>
          <span className="text-xs">{spectatorCount}</span>
        </div>
        <LiveIndicator size="sm" />
      </div>
    </div>
  )
}
