interface SkeletonProps {
  className?: string
  width?: string | number
  height?: string | number
  rounded?: boolean
  circle?: boolean
  style?: React.CSSProperties
}

export default function Skeleton({ className = '', width, height, rounded, circle, style }: SkeletonProps) {
  return (
    <div
      className={`animate-shimmer ${className}`}
      style={{
        width,
        height,
        borderRadius: circle ? '50%' : rounded ? 9999 : 6,
        background: 'linear-gradient(90deg, #13131a 25%, #1e1e2e 50%, #13131a 75%)',
        backgroundSize: '200% 100%',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}

// ─── Preset compositions ──────────────────────────────────────────────────────

export function SkeletonGameCard() {
  return (
    <div
      className="flex flex-col gap-3 p-4"
      style={{ background: '#13131a', border: '1.5px solid #1e1e2e' }}
    >
      {/* Top row: status badge + metadata */}
      <div className="flex items-center justify-between">
        <Skeleton width={52} height={18} rounded />
        <div className="flex gap-2">
          <Skeleton width={32} height={12} rounded />
          <Skeleton width={44} height={12} rounded />
        </div>
      </div>

      {/* Players row */}
      <div className="flex items-center gap-2">
        {/* White side */}
        <div className="flex items-center gap-1.5 flex-1">
          <Skeleton width={28} height={28} circle />
          <div className="flex flex-col gap-1">
            <Skeleton width={72} height={11} rounded />
            <Skeleton width={44} height={9}  rounded />
          </div>
        </div>
        <Skeleton width={20} height={12} rounded />
        {/* Black side */}
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <div className="flex flex-col gap-1 items-end">
            <Skeleton width={72} height={11} rounded />
            <Skeleton width={44} height={9}  rounded />
          </div>
          <Skeleton width={28} height={28} circle />
        </div>
      </div>

      {/* Sparkline area */}
      <Skeleton height={110} style={{ borderRadius: 8 }} />

      {/* Stake bar */}
      <div className="flex flex-col gap-1">
        <div className="flex justify-between">
          <Skeleton width={60} height={10} rounded />
          <Skeleton width={60} height={10} rounded />
        </div>
        <Skeleton height={6} rounded />
      </div>

      {/* Footer */}
      <div className="flex justify-between">
        <Skeleton width={80} height={10} rounded />
        <Skeleton width={80} height={10} rounded />
      </div>
    </div>
  )
}