import { useEffect, useRef, useState } from 'react'
import SEO, { BASE_URL } from '../components/SEO'
import { useIsMobile } from '../hooks/useIsMobile'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import LiveIndicator from '../components/ui/LiveIndicator'
import Avatar from '../components/ui/Avatar'

const DEMO_PLAYERS = {
  white: { name: 'GrandmasterX', trustScore: 98, prize: 2.5 },
  black: { name: 'SolKnight', trustScore: 95, prize: 2.5 },
}

interface SanMove {
  number: number
  white: string
  black?: string
}

const INITIAL_TIME = 60

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

export default function HomePage() {
  const isMobile = useIsMobile()
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  const [lastMove, setLastMove] = useState<Record<string, React.CSSProperties>>({})
  const [movePairs, setMovePairs] = useState<SanMove[]>([])
  const [whiteTime, setWhiteTime] = useState(INITIAL_TIME)
  const [blackTime, setBlackTime] = useState(INITIAL_TIME)
  const [winner, setWinner] = useState<string | null>(null)
  const moveListRef = useRef<HTMLDivElement>(null)
  const turn = new Chess(fen).turn()

  useEffect(() => {
    moveListRef.current?.scrollTo({ top: moveListRef.current.scrollHeight, behavior: 'smooth' })
  }, [movePairs])

  // Tick active player's clock
  useEffect(() => {
    if (winner) return
    const tick = setInterval(() => {
      if (turn === 'w') {
        setWhiteTime(t => {
          if (t <= 1) {
            setWinner(DEMO_PLAYERS.black.name)
            return 0
          }
          return t - 1
        })
      } else {
        setBlackTime(t => {
          if (t <= 1) {
            setWinner(DEMO_PLAYERS.white.name)
            return 0
          }
          return t - 1
        })
      }
    }, 1000)
    return () => clearInterval(tick)
  }, [turn, winner])

  // Auto-restart after winner shown
  useEffect(() => {
    if (!winner) return
    const t = setTimeout(() => {
      setFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
      setLastMove({})
      setMovePairs([])
      setWhiteTime(INITIAL_TIME)
      setBlackTime(INITIAL_TIME)
      setWinner(null)
    }, 4000)
    return () => clearTimeout(t)
  }, [winner])

  useEffect(() => {
    if (winner) return
    const game = new Chess(fen)

    const timer = setTimeout(() => {
      if (game.isGameOver()) {
        const result = game.isCheckmate()
          ? (game.turn() === 'w' ? DEMO_PLAYERS.black.name : DEMO_PLAYERS.white.name)
          : 'Draw'
        setWinner(result)
        return
      }

      const moves = game.moves({ verbose: true })
      if (!moves.length) return

      const captures = moves.filter(m => m.flags.includes('c') || m.flags.includes('e'))
      const checks = moves.filter(m => m.san.includes('+'))
      const pool = checks.length ? checks : captures.length && Math.random() > 0.5 ? captures : moves
      const move = pool[Math.floor(Math.random() * pool.length)]
      const isWhite = game.turn() === 'w'

      game.move(move)
      setFen(game.fen())
      setLastMove({
        [move.from]: { background: 'rgba(255,215,0,0.25)' },
        [move.to]: { background: 'rgba(255,215,0,0.4)' },
      })
      // Reset the next player's thinking clock
      if (isWhite) setBlackTime(INITIAL_TIME)
      else setWhiteTime(INITIAL_TIME)

      setMovePairs(prev => {
        if (isWhite) {
          return [...prev, { number: prev.length + 1, white: move.san }]
        } else {
          const updated = [...prev]
          if (updated.length > 0) {
            updated[updated.length - 1] = { ...updated[updated.length - 1], black: move.san }
          }
          return updated
        }
      })
    }, 1400)

    return () => clearTimeout(timer)
  }, [fen])

  return (
    <div className="relative flex flex-col h-[calc(100vh-140px)] px-4 py-3 gap-2">
      <SEO
        url={BASE_URL}
        structuredData={{
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'SolChess',
          url: BASE_URL,
          applicationCategory: 'GameApplication',
          operatingSystem: 'Web',
          description: 'Trustless chess platform on Solana. Wager SOL, stake on outcomes, win on-chain — no middleman, instant settlement.',
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
            description: 'Free to play. Wagers and stakes use SOL.',
          },
          author: {
            '@type': 'Organization',
            name: 'SolChess',
            url: BASE_URL,
          },
        }}
      />

      {/* Black player card */}
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0 transition-all duration-300"
        style={{
          background: turn === 'b' ? 'rgba(153,69,255,0.08)' : '#13131a',
          border: `1.5px solid ${turn === 'b' ? '#9945FF' : '#2a2a3a'}`,
        }}
      >
        <div className="flex items-center gap-3">
          <Avatar username={DEMO_PLAYERS.black.name} size="md" />
          <div>
            <p className="text-sm font-semibold text-white">{DEMO_PLAYERS.black.name}</p>
            <p className="text-[10px]" style={{ color: '#8888aa' }}>Trust: {DEMO_PLAYERS.black.trustScore}</p>
          </div>
          <span className="text-lg">♚</span>
        </div>
        <div className="flex items-center gap-3">
          {turn === 'b' && <LiveIndicator size="sm" showText={false} />}
          <div
            className="px-3 py-1 font-mono font-bold text-sm tabular-nums transition-colors duration-300"
            style={{ background: '#0a0a0f', border: `1px solid ${blackTime <= 15 ? '#FF3B30' : turn === 'b' ? '#9945FF' : '#2a2a3a'}`, color: blackTime <= 15 ? '#FF3B30' : turn === 'b' ? '#9945FF' : '#ffffff' }}
          >
            {fmt(blackTime)}
          </div>
        </div>
      </div>

      {/* Board + Move history side by side */}
      <div className="flex-1 flex gap-3 min-h-0">

        {/* Chess board */}
        <div className="flex-1 flex items-center justify-center min-h-0 min-w-0">
          <div
            className="overflow-hidden"
            style={{
              border: '2px solid #2a2a3a',
              width: isMobile ? 'min(100vw - 16px, 480px)' : 'min(100%, calc(100vh - 320px))',
              aspectRatio: '1 / 1',
            }}
          >
            <Chessboard
              options={{
                position: fen,
                boardOrientation: 'white',
                allowDragging: false,
                squareStyles: lastMove,
                darkSquareStyle: { backgroundColor: '#4a3728' },
                lightSquareStyle: { backgroundColor: '#c8a97e' },
                animationDurationInMs: 300,
                boardStyle: { width: '100%', height: '100%' },
              }}
            />
          </div>
        </div>

        {/* Move history panel — hidden on mobile */}
        {!isMobile && <div
          className="w-[200px] flex-shrink-0 flex flex-col overflow-hidden"
          style={{ background: '#13131a', border: '1.5px solid #2a2a3a' }}
        >
          <div className="px-3 py-2 flex-shrink-0" style={{ borderBottom: '1px solid #2a2a3a' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
              Moves
            </p>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-3 px-2 py-1 flex-shrink-0" style={{ borderBottom: '1px solid #1a1a28' }}>
            <span className="text-[9px] font-medium" style={{ color: '#8888aa' }}>#</span>
            <span className="text-[9px] font-medium" style={{ color: '#8888aa' }}>White</span>
            <span className="text-[9px] font-medium" style={{ color: '#8888aa' }}>Black</span>
          </div>

          {/* Move list */}
          <div ref={moveListRef} className="flex-1 overflow-y-auto px-1 py-1">
            {movePairs.length === 0 ? (
              <p className="text-[10px] text-center py-4" style={{ color: '#8888aa' }}>
                Game starting...
              </p>
            ) : (
              movePairs.map((pair, i) => (
                <div
                  key={pair.number}
                  className="grid grid-cols-3 px-1 py-0.5 rounded text-xs font-mono"
                  style={{ background: i === movePairs.length - 1 ? 'rgba(153,69,255,0.12)' : 'transparent' }}
                >
                  <span style={{ color: '#8888aa' }}>{pair.number}.</span>
                  <span
                    className="font-medium"
                    style={{ color: i === movePairs.length - 1 && turn === 'b' ? '#ffffff' : '#cccccc' }}
                  >
                    {pair.white}
                  </span>
                  <span
                    className="font-medium"
                    style={{ color: i === movePairs.length - 1 && turn === 'w' && pair.black ? '#ffffff' : '#cccccc' }}
                  >
                    {pair.black ?? ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>}
      </div>

      {/* White player card */}
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0 transition-all duration-300"
        style={{
          background: turn === 'w' ? 'rgba(20,241,149,0.06)' : '#13131a',
          border: `1.5px solid ${turn === 'w' ? '#14F195' : '#2a2a3a'}`,
        }}
      >
        <div className="flex items-center gap-3">
          <Avatar username={DEMO_PLAYERS.white.name} size="md" />
          <div>
            <p className="text-sm font-semibold text-white">{DEMO_PLAYERS.white.name}</p>
            <p className="text-[10px]" style={{ color: '#8888aa' }}>Trust: {DEMO_PLAYERS.white.trustScore}</p>
          </div>
          <span className="text-lg">♔</span>
        </div>
        <div className="flex items-center gap-3">
          {turn === 'w' && <LiveIndicator size="sm" showText={false} />}
          <div
            className="px-3 py-1 font-mono font-bold text-sm tabular-nums transition-colors duration-300"
            style={{ background: '#0a0a0f', border: `1px solid ${whiteTime <= 15 ? '#FF3B30' : turn === 'w' ? '#14F195' : '#2a2a3a'}`, color: whiteTime <= 15 ? '#FF3B30' : turn === 'w' ? '#14F195' : '#ffffff' }}
          >
            {fmt(whiteTime)}
          </div>
        </div>
      </div>

      {/* Winner overlay */}
      {winner && (
        <div
          className="absolute inset-0 flex items-center justify-center z-50"
          style={{ background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(8px)' }}
        >
          <div className="flex flex-col items-center gap-4 text-center px-8 py-10 rounded-2xl"
            style={{ background: '#13131a', border: '1.5px solid #2a2a3a', boxShadow: '0 0 60px rgba(153,69,255,0.3)' }}
          >
            <span className="text-5xl">🏆</span>
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
              {winner === 'Draw' ? 'Game Over' : 'Winner'}
            </p>
            <p className="text-4xl font-bold" style={{ color: '#14F195', textShadow: '0 0 20px rgba(20,241,149,0.5)' }}>
              {winner}
            </p>
            <p className="text-sm" style={{ color: '#8888aa' }}>New game starting...</p>
          </div>
        </div>
      )}

    </div>
  )
}
