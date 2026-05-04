import PrizePool from './PrizePool'
import StakeButton from './StakeButton'

interface StakePanelProps {
  prizePool: number
  stakesWhite: number
  stakesBlack: number
  onStake: (side: 'white' | 'black', amount: number) => void
}

export default function StakePanel({ prizePool, stakesWhite, stakesBlack, onStake }: StakePanelProps) {
  return (
    <div className="flex flex-col gap-4">
      <PrizePool amount={prizePool} />

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg p-2" style={{ background: '#0a0a0f', border: '1px solid #2a2a3a' }}>
          <p className="text-[10px]" style={{ color: '#8888aa' }}>White staked</p>
          <p className="text-sm font-bold text-white">{stakesWhite.toFixed(4)}</p>
        </div>
        <div className="rounded-lg p-2" style={{ background: '#0a0a0f', border: '1px solid #2a2a3a' }}>
          <p className="text-[10px]" style={{ color: '#8888aa' }}>Black staked</p>
          <p className="text-sm font-bold text-white">{stakesBlack.toFixed(4)}</p>
        </div>
      </div>

      <StakeButton side="white" onStake={(amt) => onStake('white', amt)} offsetColor="green" />
      <StakeButton side="black" onStake={(amt) => onStake('black', amt)} offsetColor="purple" />
    </div>
  )
}
