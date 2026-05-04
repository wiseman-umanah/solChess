interface TrustScoreProps {
  score: number
  size?: number
}

export default function TrustScore({ score, size = 80 }: TrustScoreProps) {
  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(Math.max(score, 0), 100)
  const dashOffset = circumference - (progress / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-1" title="Earned through puzzle solving and fair play">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="rotate-[-90deg]">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#2a2a3a"
            strokeWidth="6"
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#9945FF"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ filter: 'drop-shadow(0 0 4px #9945FF)', transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        {/* Score number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-white">{score}</span>
        </div>
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#8888aa' }}>
        Trust Score
      </span>
    </div>
  )
}
