import React, { useMemo, useState } from 'react'
import type { OffsetColor } from '../../types'

interface DoubleButtonProps {
  children: React.ReactNode
  offsetColor?: OffsetColor
  onClick?: () => void
  icon?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

function resolveColor(offsetColor: OffsetColor): string {
  if (offsetColor === 'purple') return '#9945FF'
  if (offsetColor === 'green') return '#14F195'
  return Math.random() > 0.5 ? '#9945FF' : '#14F195'
}

const sizeClasses = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

export default function DoubleButton({
  children,
  offsetColor = 'random',
  onClick,
  icon,
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
}: DoubleButtonProps) {
  const color = useMemo(() => resolveColor(offsetColor), [offsetColor])
  const [pressed, setPressed] = useState(false)

  const handleMouseDown = () => !disabled && setPressed(true)
  const handleMouseUp = () => setPressed(false)
  const handleMouseLeave = () => setPressed(false)

  return (
    <div className={`relative inline-block ${disabled ? 'opacity-50' : ''} ${className}`}>
      {/* Bottom offset layer */}
      <div
        className="absolute w-full h-full"
        style={{ top: 3, left: 3, background: color, zIndex: 0 }}
      />
      {/* Button */}
      <button
        type={type}
        onClick={onClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        disabled={disabled}
        aria-disabled={disabled}
        className={`
          relative z-10 w-full flex items-center gap-2 font-semibold
          tracking-wide uppercase transition-transform duration-75
          ${sizeClasses[size]}
          ${pressed ? 'translate-x-[3px] translate-y-[3px]' : ''}
          ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        `}
        style={{
          background: '#13131a',
          border: '1.5px solid #2a2a3a',
          color: '#ffffff',
        }}
      >
        {icon && <span className="text-lg leading-none">{icon}</span>}
        {children}
      </button>
    </div>
  )
}
