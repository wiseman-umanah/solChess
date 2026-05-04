import { useEffect, useState } from 'react'

interface TimerProps {
  initialSeconds: number
  running: boolean
  onExpire?: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function Timer({ initialSeconds, running, onExpire }: TimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds)

  useEffect(() => {
    setSeconds(initialSeconds)
  }, [initialSeconds])

  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          onExpire?.()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [running, onExpire])

  const isLow = seconds < 30
  const isCritical = seconds < 10

  return (
    <div
      className="px-3 py-1 rounded-lg font-mono font-bold text-sm tabular-nums"
      style={{
        background: isCritical ? 'rgba(255,59,48,0.15)' : '#0a0a0f',
        border: `1px solid ${isCritical ? '#FF3B30' : isLow ? '#FFD700' : '#2a2a3a'}`,
        color: isCritical ? '#FF3B30' : isLow ? '#FFD700' : '#ffffff',
      }}
      aria-label={`Timer: ${formatTime(seconds)}`}
    >
      {formatTime(seconds)}
    </div>
  )
}
