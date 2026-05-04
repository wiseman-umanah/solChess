import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import LiveIndicator from '../components/ui/LiveIndicator'
import Avatar from '../components/ui/Avatar'

// ─── Mock data ────────────────────────────────────────────────────────────────

interface GameListing {
  id: string
  white: { name: string; trustScore: number }
  black: { name: string; trustScore: number }
  prizePool: number
  stakeWhite: number
  stakeBlack: number
  // pool growth over last ~10 snapshots (SOL values)
  poolHistory: number[]
  // stake history per side over same snapshots
  whiteHistory: number[]
  blackHistory: number[]
  spectators: number
  timeControl: number | null // null = no time limit
  status: 'waiting' | 'live'
  move: number
}

const MOCK_GAMES: GameListing[] = [
  {
    id: '1', status: 'live', move: 24,
    white: { name: 'GrandmasterX', trustScore: 98 },
    black: { name: 'SolKnight', trustScore: 95 },
    prizePool: 5.0, stakeWhite: 3.2, stakeBlack: 1.8,
    poolHistory: [0.5, 1.0, 1.5, 2.0, 2.8, 3.2, 3.8, 4.2, 4.7, 5.0],
    whiteHistory: [0.3, 0.6, 0.9, 1.2, 1.8, 2.0, 2.4, 2.7, 3.0, 3.2],
    blackHistory: [0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.5, 1.7, 1.8],
    spectators: 143, timeControl: 10,
  },
  {
    id: '2', status: 'live', move: 9,
    white: { name: 'ChainPawn', trustScore: 82 },
    black: { name: 'BlockRook', trustScore: 77 },
    prizePool: 1.0, stakeWhite: 0.5, stakeBlack: 0.5,
    poolHistory: [0.1, 0.2, 0.3, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 1.0],
    whiteHistory: [0.05, 0.1, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.48, 0.5],
    blackHistory: [0.05, 0.1, 0.1, 0.25, 0.3, 0.35, 0.4, 0.45, 0.47, 0.5],
    spectators: 12, timeControl: 3,
  },
  {
    id: '3', status: 'live', move: 41,
    white: { name: 'ZeroLatency', trustScore: 91 },
    black: { name: 'CryptoKing', trustScore: 88 },
    prizePool: 12.5, stakeWhite: 4.5, stakeBlack: 8.0,
    poolHistory: [1.0, 2.0, 3.5, 5.0, 6.5, 8.0, 9.0, 10.0, 11.5, 12.5],
    whiteHistory: [0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.2, 4.5],
    blackHistory: [0.5, 1.0, 2.0, 3.0, 4.0, 5.0, 5.5, 6.0, 7.3, 8.0],
    spectators: 312, timeControl: 30,
  },
  {
    id: '4', status: 'waiting', move: 0,
    white: { name: 'ByteBishop', trustScore: 74 },
    black: { name: 'HashKnight', trustScore: 69 },
    prizePool: 0.5, stakeWhite: 0.25, stakeBlack: 0.25,
    poolHistory: [0, 0.1, 0.2, 0.3, 0.35, 0.4, 0.45, 0.48, 0.5, 0.5],
    whiteHistory: [0, 0.05, 0.1, 0.15, 0.2, 0.22, 0.23, 0.24, 0.25, 0.25],
    blackHistory: [0, 0.05, 0.1, 0.15, 0.15, 0.18, 0.22, 0.24, 0.25, 0.25],
    spectators: 7, timeControl: 5,
  },
  {
    id: '5', status: 'live', move: 17,
    white: { name: 'LedgerQueen', trustScore: 93 },
    black: { name: 'SigmaRook', trustScore: 87 },
    prizePool: 3.2, stakeWhite: 2.6, stakeBlack: 0.6,
    poolHistory: [0.2, 0.5, 0.8, 1.2, 1.6, 2.0, 2.4, 2.8, 3.0, 3.2],
    whiteHistory: [0.2, 0.4, 0.6, 1.0, 1.4, 1.8, 2.0, 2.2, 2.4, 2.6],
    blackHistory: [0, 0.1, 0.2, 0.2, 0.2, 0.2, 0.4, 0.6, 0.6, 0.6],
    spectators: 51, timeControl: null,
  },
  {
    id: '6', status: 'live', move: 55,
    white: { name: 'MintPawn', trustScore: 96 },
    black: { name: 'NullKing', trustScore: 99 },
    prizePool: 20.0, stakeWhite: 9.0, stakeBlack: 11.0,
    poolHistory: [2, 4, 6, 8, 10, 12, 14, 16, 18, 20],
    whiteHistory: [1, 2, 3, 4, 5, 6, 7, 7.5, 8, 9],
    blackHistory: [1, 2, 3, 4, 5, 6, 7, 8.5, 10, 11],
    spectators: 891, timeControl: null,
  },
]

// ─── Dual animated sparkline ─────────────────────────────────────────────────
// Both lines share one SVG + one shared scale so they're always comparable.

interface DualSparklineProps {
  whiteData: number[]
  blackData: number[]
  w?: number
  h?: number
}

function buildSmooth(data: number[], min: number, range: number, w: number, h: number, pad: number) {
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - pad - ((v - min) / range) * (h - pad * 2),
  }))
  const d = pts.map((pt, i, arr) => {
    if (i === 0) return `M ${pt.x.toFixed(2)},${pt.y.toFixed(2)}`
    const prev = arr[i - 1]
    const cx = (prev.x + pt.x) / 2
    return `C ${cx.toFixed(2)},${prev.y.toFixed(2)} ${cx.toFixed(2)},${pt.y.toFixed(2)} ${pt.x.toFixed(2)},${pt.y.toFixed(2)}`
  }).join(' ')
  return { d, last: pts[pts.length - 1] }
}

function DualSparkline({ whiteData, blackData, w = 240, h = 110 }: DualSparklineProps) {
  const whiteRef = useRef<SVGPathElement>(null)
  const blackRef = useRef<SVGPathElement>(null)
  const pad = 8

  // Shared scale so both lines are visually comparable
  const allVals = [...whiteData, ...blackData]
  const min = Math.min(...allVals)
  const max = Math.max(...allVals)
  const range = max - min || 1

  const white = buildSmooth(whiteData, min, range, w, h, pad)
  const black = buildSmooth(blackData, min, range, w, h, pad)

  // Area fills
  const whiteArea = `M 0,${h} ${white.d.slice(2)} L ${w},${h} Z`
  const blackArea = `M 0,${h} ${black.d.slice(2)} L ${w},${h} Z`

  // Animate both lines drawing in from left
  function animateLine(ref: React.RefObject<SVGPathElement | null>) {
    const el = ref.current
    if (!el) return
    const len = el.getTotalLength()
    el.style.strokeDasharray = `${len}`
    el.style.strokeDashoffset = `${len}`
    el.getBoundingClientRect()
    el.style.transition = 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)'
    el.style.strokeDashoffset = '0'
  }

  useEffect(() => {
    animateLine(whiteRef)
    animateLine(blackRef)
  }, [])

  // Draw the higher line on top at the last point
  const whiteOnTop = whiteData[whiteData.length - 1] >= blackData[blackData.length - 1]

  const purpleId = `pu-${w}`
  const greenId  = `gr-${w}`

  const whiteLayer = (
    <>
      <path d={whiteArea} fill={`url(#${purpleId})`} />
      <path ref={whiteRef} d={white.d} fill="none" stroke="#9945FF" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={white.last.x} cy={white.last.y} r="3.5" fill="#9945FF" style={{ filter: 'drop-shadow(0 0 5px #9945FF)' }} />
    </>
  )
  const blackLayer = (
    <>
      <path d={blackArea} fill={`url(#${greenId})`} />
      <path ref={blackRef} d={black.d} fill="none" stroke="#14F195" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={black.last.x} cy={black.last.y} r="3.5" fill="#14F195" style={{ filter: 'drop-shadow(0 0 5px #14F195)' }} />
    </>
  )

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={purpleId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9945FF" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#9945FF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={greenId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14F195" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#14F195" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Render lower line first, higher line on top */}
      {whiteOnTop ? <>{blackLayer}{whiteLayer}</> : <>{whiteLayer}{blackLayer}</>}
    </svg>
  )
}

// ─── Stake bar ────────────────────────────────────────────────────────────────

function StakeBar({ whitePct }: { whitePct: number }) {
  const blackPct = 100 - whitePct
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[10px]" style={{ color: '#8888aa' }}>
        <span>♔ White <span className="font-semibold text-white">{whitePct.toFixed(0)}%</span></span>
        <span>♚ Black <span className="font-semibold text-white">{blackPct.toFixed(0)}%</span></span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden flex" style={{ background: '#2a2a3a' }}>
        <div
          className="h-full rounded-l-full transition-all duration-500"
          style={{ width: `${whitePct}%`, background: '#9945FF' }}
        />
        <div
          className="h-full rounded-r-full transition-all duration-500"
          style={{ width: `${blackPct}%`, background: '#14F195' }}
        />
      </div>
    </div>
  )
}

// ─── Game card ────────────────────────────────────────────────────────────────

function GameCard({ game }: { game: GameListing }) {
  const whitePct = (game.stakeWhite / game.prizePool) * 100
  const isLive = game.status === 'live'

  // Leading side drives card accent
  const leadColor = whitePct >= 50 ? '#9945FF' : '#14F195'

  return (
    <Link to={`/game/${game.id}`} className="block group">
      <div
        className="relative flex flex-col gap-3 p-4 transition-all duration-200 group-hover:translate-y-[-2px]"
        style={{
          background: '#13131a',
          border: `1.5px solid #2a2a3a`,
          boxShadow: `0 0 0 0 ${leadColor}`,
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 4px 24px ${leadColor}22`)}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 0 0 transparent')}
      >
        {/* Top row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isLive ? <LiveIndicator size="sm" /> : (
              <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(255,215,0,0.1)', color: '#FFD700', border: '1px solid rgba(255,215,0,0.2)' }}>
                Waiting
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px]" style={{ color: '#8888aa' }}>
            {game.timeControl && <span>⏱ {game.timeControl}m</span>}
            {isLive && <span>Move {game.move}</span>}
            <span>👁 {game.spectators}</span>
          </div>
        </div>

        {/* Players */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <Avatar username={game.white.name} size="sm" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{game.white.name}</p>
              <p className="text-[9px]" style={{ color: '#9945FF' }}>Trust {game.white.trustScore}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold flex-shrink-0" style={{ color: '#8888aa' }}>VS</span>
          <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
            <div className="min-w-0 text-right">
              <p className="text-xs font-semibold text-white truncate">{game.black.name}</p>
              <p className="text-[9px]" style={{ color: '#14F195' }}>Trust {game.black.trustScore}</p>
            </div>
            <Avatar username={game.black.name} size="sm" />
          </div>
        </div>

        {/* Pool sparkline */}
        <div className="relative overflow-hidden rounded-lg" style={{ background: '#0a0a0f', height: 110 }}>
          <div className="absolute inset-0">
            <DualSparkline whiteData={game.whiteHistory} blackData={game.blackHistory} />
          </div>
          {/* Prize pool label top-left */}
          <div className="absolute top-2 left-3 pointer-events-none">
            <p className="text-[9px] font-medium leading-none" style={{ color: '#8888aa' }}>Prize Pool</p>
            <p className="text-sm font-bold leading-tight" style={{ color: '#FFD700' }}>
              {game.prizePool.toFixed(4)} SOL
            </p>
          </div>
          {/* Legend top-right */}
          <div className="absolute top-2 right-3 flex items-center gap-2 pointer-events-none">
            <span className="flex items-center gap-1 text-[9px]" style={{ color: '#9945FF' }}>
              <span className="inline-block w-2 h-0.5 rounded" style={{ background: '#9945FF' }} />♔
            </span>
            <span className="flex items-center gap-1 text-[9px]" style={{ color: '#14F195' }}>
              <span className="inline-block w-2 h-0.5 rounded" style={{ background: '#14F195' }} />♚
            </span>
          </div>
        </div>

        {/* Stake bar */}
        <StakeBar whitePct={whitePct} />

        {/* Footer: individual stakes */}
        <div className="flex justify-between text-[10px]" style={{ color: '#8888aa' }}>
          <span>
            <span style={{ color: '#9945FF' }}>♔</span>{' '}
            <span className="font-semibold text-white">{game.stakeWhite.toFixed(4)}</span> SOL staked
          </span>
          <span>
            <span style={{ color: '#14F195' }}>♚</span>{' '}
            <span className="font-semibold text-white">{game.stakeBlack.toFixed(4)}</span> SOL staked
          </span>
        </div>
      </div>
    </Link>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const FILTERS = ['All', 'Live', 'Waiting'] as const
type Filter = typeof FILTERS[number]

export default function GamesPage() {
  const [filter, setFilter] = useState<Filter>('All')

  const visible = MOCK_GAMES.filter(g => {
    if (filter === 'Live') return g.status === 'live'
    if (filter === 'Waiting') return g.status === 'waiting'
    return true
  })

  const totalPool = MOCK_GAMES.reduce((s, g) => s + g.prizePool, 0)
  const liveCount = MOCK_GAMES.filter(g => g.status === 'live').length

  return (
    <div className="px-6 py-6 flex flex-col gap-6">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Games</h1>
          <p className="text-xs mt-0.5" style={{ color: '#8888aa' }}>
            Stake on outcomes · Earn SOL · All on-chain
          </p>
        </div>

        {/* Summary stats */}
        <div className="flex items-center gap-5">
          <div className="text-right">
            <p className="text-[10px]" style={{ color: '#8888aa' }}>Total in pools</p>
            <p className="text-lg font-bold" style={{ color: '#FFD700' }}>{totalPool.toFixed(2)} SOL</p>
          </div>
          <div className="text-right">
            <p className="text-[10px]" style={{ color: '#8888aa' }}>Live games</p>
            <div className="flex items-center justify-end gap-1.5">
              <LiveIndicator size="sm" showText={false} />
              <p className="text-lg font-bold text-white">{liveCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 text-xs font-semibold transition-all duration-150"
            style={{
              background: filter === f ? 'rgba(153,69,255,0.15)' : '#13131a',
              border: `1px solid ${filter === f ? '#9945FF' : '#2a2a3a'}`,
              color: filter === f ? '#9945FF' : '#8888aa',
            }}
          >
            {f}
            {f === 'Live' && (
              <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full align-middle" style={{ background: '#14F195' }} />
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visible.map(game => <GameCard key={game.id} game={game} />)}
      </div>

    </div>
  )
}
