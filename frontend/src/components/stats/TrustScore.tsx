import { useEffect, useState } from 'react'

interface TrustScoreProps {
  score: number
  size?: number
}

// Interpolate hex color: red(0) → yellow(50) → green(100)
function scoreColor(pct: number): string {
  // 0–50: red → yellow, 50–100: yellow → green
  let r: number, g: number, b = 0
  if (pct <= 50) {
    const t = pct / 50
    r = 255
    g = Math.round(t * 200)
  } else {
    const t = (pct - 50) / 50
    r = Math.round(255 * (1 - t))
    g = Math.round(200 + t * 41)  // 200 → 241
  }
  return `rgb(${r},${g},${b})`
}

export default function TrustScore({ score, size = 80 }: TrustScoreProps) {
  const [animated, setAnimated] = useState(0)

  useEffect(() => {
    // Count up from 0 to score over ~900ms
    const duration = 900
    const steps = 60
    const increment = score / steps
    const interval = duration / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= score) {
        setAnimated(score)
        clearInterval(timer)
      } else {
        setAnimated(Math.floor(current))
      }
    }, interval)

    return () => clearInterval(timer)
  }, [score])

  const radius = (size - 12) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(Math.max(animated, 0), 100)
  const dashOffset = circumference - (progress / 100) * circumference
  const color = scoreColor(progress)

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
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: 'stroke-dashoffset 0.016s linear, stroke 0.016s linear' }}
          />
        </svg>
        {/* Score number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold tabular-nums" style={{ color }}>{animated}</span>
        </div>
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: '#8888aa' }}>
        Trust Score
      </span>
    </div>
  )
}
