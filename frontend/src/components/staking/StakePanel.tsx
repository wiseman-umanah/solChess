import PrizePool from './PrizePool'
import StakeButton from './StakeButton'

interface StakePanelProps {
  prizePool: number
  stakesWhite: number
  stakesBlack: number
  stakesDraw?: number
  onStake: (side: 'white' | 'black' | 'draw', amount: number) => void
}

export default function StakePanel({ prizePool, stakesWhite, stakesBlack, stakesDraw = 0, onStake }: StakePanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <PrizePool amount={prizePool} />

      {/* Stakes breakdown — 3 columns */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2" style={{ background: '#0a0a0f', border: '1px solid #2a2a3a' }}>
          <p className="text-[10px]" style={{ color: '#9945FF' }}>♔ White</p>
          <p className="text-sm font-bold text-white">{stakesWhite.toFixed(4)}</p>
        </div>
        <div className="p-2" style={{ background: '#0a0a0f', border: '1px solid #2a2a3a' }}>
          <p className="text-[10px]" style={{ color: '#FFD700' }}>🤝 Draw</p>
          <p className="text-sm font-bold text-white">{stakesDraw.toFixed(4)}</p>
        </div>
        <div className="p-2" style={{ background: '#0a0a0f', border: '1px solid #2a2a3a' }}>
          <p className="text-[10px]" style={{ color: '#14F195' }}>♚ Black</p>
          <p className="text-sm font-bold text-white">{stakesBlack.toFixed(4)}</p>
        </div>
      </div>

      <StakeButton side="white"  onStake={(amt) => onStake('white', amt)}  offsetColor="purple" />
      <StakeButton side="draw"   onStake={(amt) => onStake('draw', amt)}   offsetColor="green"  />
      <StakeButton side="black"  onStake={(amt) => onStake('black', amt)}  offsetColor="purple" />
    </div>
  )
}