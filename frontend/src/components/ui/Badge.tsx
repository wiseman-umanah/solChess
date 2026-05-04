import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'purple' | 'green' | 'gold' | 'gray'
  size?: 'sm' | 'md'
}

const variants = {
  purple: { background: 'rgba(153,69,255,0.15)', color: '#9945FF', border: '1px solid rgba(153,69,255,0.3)' },
  green: { background: 'rgba(20,241,149,0.12)', color: '#14F195', border: '1px solid rgba(20,241,149,0.3)' },
  gold: { background: 'rgba(255,215,0,0.12)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.3)' },
  gray: { background: 'rgba(136,136,170,0.12)', color: '#8888aa', border: '1px solid rgba(136,136,170,0.2)' },
}

export default function Badge({ children, variant = 'purple', size = 'sm' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}`}
      style={variants[variant]}
    >
      {children}
    </span>
  )
}
