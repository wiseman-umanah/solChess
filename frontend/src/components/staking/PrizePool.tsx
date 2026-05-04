import { useEffect, useRef, useState } from 'react'

interface PrizePoolProps {
  amount: number
  flash?: boolean
}

export default function PrizePool({ amount, flash = false }: PrizePoolProps) {
  const [displayAmount, setDisplayAmount] = useState(amount)
  const [isFlashing, setIsFlashing] = useState(false)
  const prevAmountRef = useRef(amount)

  useEffect(() => {
    if (amount !== prevAmountRef.current) {
      setIsFlashing(true)
      const timeout = setTimeout(() => setIsFlashing(false), 600)
      prevAmountRef.current = amount
      return () => clearTimeout(timeout)
    }
    setDisplayAmount(amount)
  }, [amount])

  useEffect(() => {
    if (flash) {
      setIsFlashing(true)
      const timeout = setTimeout(() => setIsFlashing(false), 600)
      return () => clearTimeout(timeout)
    }
  }, [flash])

  return (
    <div
      className="flex flex-col items-center py-3 px-6 rounded-xl transition-all duration-300"
      style={{
        background: isFlashing ? 'rgba(20,241,149,0.08)' : '#13131a',
        border: `1.5px solid ${isFlashing ? '#14F195' : '#2a2a3a'}`,
      }}
      aria-label={`Prize pool: ${displayAmount.toFixed(4)} SOL`}
    >
      <span className="text-[10px] font-medium uppercase tracking-widest mb-0.5" style={{ color: '#8888aa' }}>
        Prize Pool
      </span>
      <span
        className="text-2xl font-bold tabular-nums transition-all duration-300"
        style={{ color: isFlashing ? '#14F195' : '#FFD700' }}
      >
        {displayAmount.toFixed(4)}
        <span className="text-base ml-1.5 font-medium">SOL</span>
      </span>
    </div>
  )
}
