import { useEffect, useState } from 'react'

// Scattered chess pieces around the viewport — purely decorative
const PARTICLES = [
  { piece: '♟', top: '12%', left: '8%',   delay: '0s',    duration: '3.2s', size: 28 },
  { piece: '♜', top: '20%', left: '88%',  delay: '0.5s',  duration: '2.8s', size: 22 },
  { piece: '♝', top: '72%', left: '6%',   delay: '1.0s',  duration: '3.6s', size: 20 },
  { piece: '♛', top: '78%', left: '85%',  delay: '0.3s',  duration: '2.5s', size: 26 },
  { piece: '♚', top: '8%',  left: '55%',  delay: '1.4s',  duration: '3.0s', size: 18 },
  { piece: '♞', top: '85%', left: '42%',  delay: '0.8s',  duration: '4.0s', size: 24 },
  { piece: '♟', top: '45%', left: '4%',   delay: '1.8s',  duration: '3.4s', size: 16 },
  { piece: '♜', top: '38%', left: '92%',  delay: '0.2s',  duration: '2.9s', size: 20 },
]

interface Props {
  visible: boolean
}

export default function SplashLoader({ visible }: Props) {
  const [mounted, setMounted] = useState(true)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    if (!visible) {
      setComplete(true)
      // Unmount after fade finishes
      const t = setTimeout(() => setMounted(false), 700)
      return () => clearTimeout(t)
    }
  }, [visible])

  if (!mounted) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: '#07070d',
        opacity: complete ? 0 : 1,
        transition: 'opacity 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
        pointerEvents: complete ? 'none' : 'all',
      }}
    >
      {/* Ambient background glows */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse 55% 50% at 50% 45%, rgba(153,69,255,0.18) 0%, transparent 70%),
            radial-gradient(ellipse 30% 30% at 30% 70%, rgba(20,241,149,0.06) 0%, transparent 60%),
            radial-gradient(ellipse 25% 25% at 70% 25%, rgba(153,69,255,0.08) 0%, transparent 60%)
          `,
        }}
      />

      {/* Floating chess piece particles */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="absolute select-none pointer-events-none"
          style={{
            top: p.top,
            left: p.left,
            fontSize: p.size,
            color: i % 2 === 0 ? '#9945FF' : '#14F195',
            animation: `particle-drift ${p.duration} ${p.delay} ease-in-out infinite`,
            opacity: 0.12,
          }}
        >
          {p.piece}
        </span>
      ))}

      {/* Center logo cluster */}
      <div className="relative flex items-center justify-center w-44 h-44 mb-8">

        {/* Outer spinning gradient arc */}
        <svg
          className="absolute inset-0 w-full h-full animate-ring-spin"
          viewBox="0 0 176 176"
        >
          <defs>
            <linearGradient id="arc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#9945FF" stopOpacity="1" />
              <stop offset="100%" stopColor="#14F195" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <circle
            cx="88" cy="88" r="82"
            fill="none"
            stroke="url(#arc-grad)"
            strokeWidth="2.5"
            strokeDasharray="220 296"
            strokeLinecap="round"
          />
        </svg>

        {/* Inner counter-rotating dotted ring */}
        <svg
          className="absolute inset-0 w-full h-full animate-ring-reverse"
          viewBox="0 0 176 176"
          style={{ inset: 12, width: 'calc(100% - 24px)', height: 'calc(100% - 24px)' }}
        >
          <circle
            cx="76" cy="76" r="68"
            fill="none"
            stroke="rgba(20,241,149,0.25)"
            strokeWidth="1.5"
            strokeDasharray="12 22"
            strokeLinecap="round"
          />
        </svg>

        {/* Knight — the hero */}
        <span
          className="relative text-[80px] select-none animate-float"
          style={{
            filter: `
              drop-shadow(0 0 16px rgba(153,69,255,0.9))
              drop-shadow(0 0 40px rgba(153,69,255,0.5))
              drop-shadow(0 0 80px rgba(153,69,255,0.2))
            `,
            color: '#ffffff',
            lineHeight: 1,
          }}
        >
          ♞
        </span>
      </div>

      {/* Brand name */}
      <h1
        className="text-4xl font-black tracking-[0.25em] uppercase mb-1.5 select-none"
        style={{
          background: 'linear-gradient(135deg, #9945FF 0%, #c77dff 40%, #14F195 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}
      >
        SolChess
      </h1>

      <p
        className="text-[11px] uppercase tracking-[0.35em] mb-10 select-none"
        style={{ color: '#444466' }}
      >
        Chess · On-Chain · Solana
      </p>

      {/* Progress bar */}
      <div className="w-52 flex flex-col gap-2.5">
        <div
          className="h-[3px] rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        >
          <div
            className={complete ? '' : 'animate-progress-auto'}
            style={{
              height: '100%',
              width: complete ? '100%' : undefined,
              transition: complete ? 'width 0.3s ease-out' : undefined,
              background: 'linear-gradient(90deg, #9945FF, #14F195)',
              boxShadow: '0 0 10px rgba(153,69,255,0.7), 0 0 20px rgba(153,69,255,0.3)',
              borderRadius: 9999,
            }}
          />
        </div>

        <p
          className="text-[10px] text-center uppercase tracking-widest select-none"
          style={{ color: '#333355' }}
        >
          {complete ? 'Ready' : 'Initializing…'}
        </p>
      </div>
    </div>
  )
}