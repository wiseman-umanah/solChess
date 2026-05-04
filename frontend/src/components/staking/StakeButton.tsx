import { useState } from 'react'
import DoubleButton from '../ui/DoubleButton'
import type { OffsetColor } from '../../types'

interface StakeButtonProps {
  side: 'white' | 'black'
  onStake: (amount: number) => void
  offsetColor?: OffsetColor
}

const PRESET_AMOUNTS = [0.1, 0.25, 0.5, 1.0]

export default function StakeButton({ side, onStake, offsetColor }: StakeButtonProps) {
  const [customAmount, setCustomAmount] = useState('')
  const [showInput, setShowInput] = useState(false)

  function handlePreset(amount: number) {
    onStake(amount)
  }

  function handleCustom() {
    const val = parseFloat(customAmount)
    if (!isNaN(val) && val > 0) {
      onStake(val)
      setCustomAmount('')
      setShowInput(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
        Stake on {side === 'white' ? '♔ White' : '♚ Black'}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {PRESET_AMOUNTS.map((amount) => (
          <DoubleButton
            key={amount}
            offsetColor={offsetColor ?? (side === 'white' ? 'green' : 'purple')}
            size="sm"
            onClick={() => handlePreset(amount)}
          >
            {amount} SOL
          </DoubleButton>
        ))}
        <DoubleButton
          offsetColor="purple"
          size="sm"
          onClick={() => setShowInput((v) => !v)}
        >
          Custom
        </DoubleButton>
      </div>

      {showInput && (
        <div className="flex gap-1.5">
          <input
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustom()}
            placeholder="0.0000 SOL"
            type="number"
            min="0"
            step="0.0001"
            aria-label="Custom stake amount"
            className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none"
            style={{ background: '#0a0a0f', border: '1px solid #2a2a3a', color: '#ffffff' }}
          />
          <button
            onClick={handleCustom}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: '#14F195', color: '#0a0a0f' }}
          >
            Stake
          </button>
        </div>
      )}
    </div>
  )
}
