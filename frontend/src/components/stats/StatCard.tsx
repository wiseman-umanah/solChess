import { useEffect, useState } from 'react'
import DoubleCard from '../ui/DoubleCard'
import type { OffsetColor } from '../../types'

interface StatCardProps {
  label: string
  value: string | number
  subtitle?: string
  offsetColor?: OffsetColor
  gold?: boolean
}

// Splits "72.5%" → { num: 72.5, suffix: "%" }
// Splits "1.2840 SOL" → { num: 1.2840, suffix: " SOL" }
// Plain number → { num: 47, suffix: "" }
function parseValue(value: string | number): { num: number; suffix: string; decimals: number } | null {
  if (typeof value === 'number') return { num: value, suffix: '', decimals: 0 }
  const match = value.match(/^([\d.]+)(.*)$/)
  if (!match) return null
  const num = parseFloat(match[1])
  const suffix = match[2]
  const decimals = (match[1].split('.')[1] ?? '').length
  return isNaN(num) ? null : { num, suffix, decimals }
}

function useCountUp(target: number, decimals: number) {
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (target === 0) return
    const duration = 900
    const steps = 60
    const interval = duration / steps
    const increment = target / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= target) {
        setVal(target)
        clearInterval(timer)
      } else {
        setVal(parseFloat(current.toFixed(decimals)))
      }
    }, interval)

    return () => clearInterval(timer)
  }, [target, decimals])

  return val
}

export default function StatCard({ label, value, subtitle, offsetColor = 'random', gold = false }: StatCardProps) {
  const parsed = parseValue(value)
  const counted = useCountUp(parsed?.num ?? 0, parsed?.decimals ?? 0)

  const displayValue = parsed
    ? `${counted.toFixed(parsed.decimals)}${parsed.suffix}`
    : value

  return (
    <DoubleCard offsetColor={offsetColor}>
      <div className="p-3">
        <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: '#8888aa' }}>
          {label}
        </p>
        <p className="text-xl font-bold leading-none tabular-nums" style={{ color: gold ? '#FFD700' : '#ffffff' }}>
          {displayValue}
        </p>
        {subtitle && (
          <p className="text-[11px] mt-0.5" style={{ color: '#8888aa' }}>
            {subtitle}
          </p>
        )}
      </div>
    </DoubleCard>
  )
}
