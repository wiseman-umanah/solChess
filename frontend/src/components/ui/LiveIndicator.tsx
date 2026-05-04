interface LiveIndicatorProps {
  size?: 'sm' | 'md'
  showText?: boolean
}

export default function LiveIndicator({ size = 'md', showText = true }: LiveIndicatorProps) {
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs'

  return (
    <div className="flex items-center gap-1.5" aria-label="Live">
      <span
        className={`${dotSize} rounded-full animate-pulse-live inline-block`}
        style={{ background: '#14F195', boxShadow: '0 0 6px #14F195' }}
      />
      {showText && (
        <span className={`${textSize} font-semibold tracking-widest uppercase`} style={{ color: '#14F195' }}>
          LIVE
        </span>
      )}
    </div>
  )
}
