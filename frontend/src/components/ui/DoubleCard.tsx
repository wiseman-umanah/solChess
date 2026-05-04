import React, { useMemo } from 'react'
import type { OffsetColor } from '../../types'

interface DoubleCardProps {
  children: React.ReactNode
  offsetColor?: OffsetColor
  className?: string
  onClick?: () => void
}

function resolveColor(offsetColor: OffsetColor): string {
  if (offsetColor === 'purple') return '#9945FF'
  if (offsetColor === 'green') return '#14F195'
  return Math.random() > 0.5 ? '#9945FF' : '#14F195'
}

export default function DoubleCard({
  children,
  offsetColor = 'random',
  className = '',
  onClick,
}: DoubleCardProps) {
  const color = useMemo(() => resolveColor(offsetColor), [offsetColor])

  return (
    <div
      className={`relative inline-block w-full ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Bottom offset layer */}
      <div
        className="absolute w-full h-full"
        style={{ top: 3, left: 3, background: color, zIndex: 0 }}
      />
      {/* Top card layer */}
      <div
        className="relative z-10 transition-transform duration-100"
        style={{
          background: '#13131a',
          border: '1.5px solid #2a2a3a',
        }}
      >
        {children}
      </div>
    </div>
  )
}
