import DoubleCard from '../ui/DoubleCard'
import type { OffsetColor } from '../../types'

interface StatCardProps {
  label: string
  value: string | number
  subtitle?: string
  offsetColor?: OffsetColor
  gold?: boolean
}

export default function StatCard({ label, value, subtitle, offsetColor = 'random', gold = false }: StatCardProps) {
  return (
    <DoubleCard offsetColor={offsetColor}>
      <div className="p-3">
        <p className="text-[10px] font-medium uppercase tracking-wider mb-1" style={{ color: '#8888aa' }}>
          {label}
        </p>
        <p
          className="text-xl font-bold leading-none"
          style={{ color: gold ? '#FFD700' : '#ffffff' }}
        >
          {value}
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
