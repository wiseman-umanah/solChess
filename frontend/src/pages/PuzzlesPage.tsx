import { useState, useEffect, useCallback } from 'react'
import SEO from '../components/SEO'
import { useIsMobile } from '../hooks/useIsMobile'
import ChessBoard from '../components/chess/ChessBoard'
import DoubleButton from '../components/ui/DoubleButton'
import Badge from '../components/ui/Badge'
import { Chess } from 'chess.js'

interface Puzzle {
  id: string
  fen: string
  solution: string[]
  difficulty: 'easy' | 'medium' | 'hard'
  theme: string
  orientation: 'white' | 'black'
}

const DIFFICULTY_COLORS = {
  easy: 'green' as const,
  medium: 'purple' as const,
  hard: 'gold' as const,
}

function ratingToDifficulty(rating: number): Puzzle['difficulty'] {
  if (rating < 1400) return 'easy'
  if (rating < 1800) return 'medium'
  return 'hard'
}

// Lichess puzzle FEN is the position BEFORE the first move (opponent's move)
// We need to play that first move to get the position the player sees
function applyFirstMove(fen: string, uciMoves: string[]): { fen: string; solution: string[]; orientation: 'white' | 'black' } {
  const game = new Chess(fen)
  const first = uciMoves[0]
  const { from, to, promotion } = parseUci(first)
  game.move({ from, to, promotion: promotion || 'q' })
  // After opponent's move, it's the player's turn
  const orientation = game.turn() === 'w' ? 'white' : 'black'
  return { fen: game.fen(), solution: uciMoves.slice(1), orientation }
}

function parseUci(uci: string) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }
}

export default function PuzzlesPage() {
  const isMobile = useIsMobile()
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null)
  const [fetchError, setFetchError] = useState(false)
  const [board, setBoard] = useState('')
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong' | 'waiting'>('idle')
  const [solutionStep, setSolutionStep] = useState(0)
  const [hintSquare, setHintSquare] = useState<string | null>(null)
  const [hintUsed, setHintUsed] = useState(false)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)

  useEffect(() => {
    fetch('https://lichess.org/api/puzzle/daily', { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(data => {
        const raw = data.puzzle
        const { fen, solution, orientation } = applyFirstMove(data.game.fen, raw.solution)
        setPuzzle({
          id: raw.id,
          fen,
          solution,
          difficulty: ratingToDifficulty(raw.rating),
          theme: raw.themes?.[0] ?? 'Tactics',
          orientation,
        })
        setBoard(fen)
      })
      .catch(() => setFetchError(true))
  }, [])

  const playOpponentMove = useCallback((currentFen: string, step: number) => {
    if (!puzzle) return
    const opponentUci = puzzle.solution[step]
    if (!opponentUci) return

    setStatus('waiting')
    setTimeout(() => {
      const { from, to, promotion } = parseUci(opponentUci)
      const game = new Chess(currentFen)
      const result = game.move({ from, to, promotion: promotion || 'q' })
      if (!result) return

      const nextStep = step + 1
      setBoard(game.fen())
      setLastMove({ from, to })
      setSolutionStep(nextStep)
      setStatus(nextStep >= puzzle.solution.length ? 'correct' : 'idle')
    }, 450)
  }, [puzzle])

  function handleMove(move: { from: string; to: string; promotion?: string }): boolean {
    if (!puzzle || status === 'waiting' || status === 'correct') return false
    try {
      const game = new Chess(board)
      const result = game.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' })
      if (!result) return false

      const made = `${move.from}${move.to}`
      const newFen = game.fen()
      setHintSquare(null)

      if (made === puzzle.solution[solutionStep]) {
        setBoard(newFen)
        setLastMove({ from: move.from, to: move.to })
        const nextStep = solutionStep + 1
        if (nextStep >= puzzle.solution.length) {
          setSolutionStep(nextStep)
          setStatus('correct')
        } else {
          playOpponentMove(newFen, nextStep)
        }
      } else {
        setStatus('wrong')
        setTimeout(() => setStatus('idle'), 1200)
      }
      return true
    } catch {
      return false
    }
  }

  function showHint() {
    if (!puzzle) return
    const { from } = parseUci(puzzle.solution[solutionStep])
    setHintSquare(from)
    setHintUsed(true)
    setTimeout(() => setHintSquare(null), 2500)
  }

  function nextPuzzle() {
    // Re-fetch a new daily puzzle (Lichess only has one per day, so just reset)
    setFetchError(false)
    setPuzzle(null)
    setBoard('')
    setStatus('idle')
    setSolutionStep(0)
    setHintSquare(null)
    setHintUsed(false)
    setLastMove(null)
    fetch('https://lichess.org/api/puzzle/daily', { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(data => {
        const raw = data.puzzle
        const { fen, solution, orientation } = applyFirstMove(data.game.fen, raw.solution)
        setPuzzle({ id: raw.id, fen, solution, difficulty: ratingToDifficulty(raw.rating), theme: raw.themes?.[0] ?? 'Tactics', orientation })
        setBoard(fen)
      })
      .catch(() => setFetchError(true))
  }

  function reset() {
    if (!puzzle) return
    setBoard(puzzle.fen)
    setStatus('idle')
    setSolutionStep(0)
    setHintSquare(null)
    setHintUsed(false)
    setLastMove(null)
  }

  const customSquares: Record<string, React.CSSProperties> = hintSquare
    ? { [hintSquare]: { background: 'rgba(153,69,255,0.55)', boxShadow: 'inset 0 0 0 3px #9945FF' } }
    : {}

  const isDisabled = status === 'correct' || status === 'waiting'
  const playerMovesLeft = puzzle ? Math.ceil((puzzle.solution.length - solutionStep) / 2) : 0

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20 px-4">
        <p className="text-white font-semibold">Could not load today's puzzle.</p>
        <button onClick={() => { setFetchError(false); nextPuzzle() }} className="text-sm px-4 py-2" style={{ color: '#9945FF', border: '1px solid #9945FF' }}>
          Try again
        </button>
      </div>
    )
  }

  if (!puzzle) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-sm animate-pulse" style={{ color: '#8888aa' }}>Loading today's puzzle…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8">
      <SEO
        title="Daily Chess Puzzles — Sharpen Your Game"
        description="Solve today's Lichess daily puzzle on SolChess. Train your tactics and get ready to wager SOL against real opponents."
        url="https://sol-chess-nine.vercel.app/puzzles"
      />
      <div className="w-full" style={{ maxWidth: 640 }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Daily Puzzle</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={DIFFICULTY_COLORS[puzzle.difficulty]}>{puzzle.difficulty}</Badge>
              <Badge variant="gray">{puzzle.theme}</Badge>
              {hintUsed && (
                <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5" style={{ color: '#9945FF', border: '1px solid rgba(153,69,255,0.3)' }}>
                  Hint used
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-mono" style={{ color: '#8888aa' }}>
              #{puzzle.id}
            </p>
            {status !== 'correct' && (
              <p className="text-[11px] mt-0.5" style={{ color: '#555577' }}>
                {playerMovesLeft} move{playerMovesLeft !== 1 ? 's' : ''} to find
              </p>
            )}
          </div>
        </div>

        {/* Status indicator — on mobile shown above board */}
        {isMobile && (
          <div
            className="flex items-center justify-center text-[11px] font-semibold text-center py-2.5 px-3 mb-3 leading-tight"
            style={{
              border: '1.5px solid',
              borderColor: status === 'correct' ? '#14F195' : status === 'wrong' ? '#FF3B30' : '#2a2a3a',
              background: status === 'correct' ? 'rgba(20,241,149,0.08)' : status === 'wrong' ? 'rgba(255,59,48,0.08)' : 'transparent',
              color: status === 'correct' ? '#14F195' : status === 'wrong' ? '#FF3B30' : '#555577',
              transition: 'border-color 0.2s, background 0.2s, color 0.2s',
            }}
          >
            {status === 'correct' ? '✓ Brilliant!' : status === 'wrong' ? '✗ Try again' : status === 'waiting' ? 'Opponent…' : 'Find the best move'}
          </div>
        )}

        {/* Board + side buttons */}
        <div className={isMobile ? 'flex flex-col gap-3' : 'flex items-stretch gap-3'}>
          <div className={isMobile ? 'w-full' : 'flex-1 min-w-0'}>
            <ChessBoard
              position={board}
              orientation={puzzle.orientation}
              onMove={handleMove}
              disabled={isDisabled}
              lastMove={lastMove}
              customSquares={customSquares}
            />
          </div>

          {/* Desktop: side panel */}
          {!isMobile && (
            <div className="flex flex-col gap-2.5" style={{ width: 110, flexShrink: 0 }}>
              <div
                className="flex items-center justify-center text-[10px] font-semibold text-center py-2 px-1.5 leading-tight"
                style={{
                  minHeight: 48,
                  border: '1.5px solid',
                  borderColor: status === 'correct' ? '#14F195' : status === 'wrong' ? '#FF3B30' : '#2a2a3a',
                  background: status === 'correct' ? 'rgba(20,241,149,0.08)' : status === 'wrong' ? 'rgba(255,59,48,0.08)' : 'transparent',
                  color: status === 'correct' ? '#14F195' : status === 'wrong' ? '#FF3B30' : '#555577',
                  transition: 'border-color 0.2s, background 0.2s, color 0.2s',
                }}
              >
                {status === 'correct' ? '✓ Brilliant!' : status === 'wrong' ? '✗ Try again' : status === 'waiting' ? 'Opponent…' : 'Find the best move'}
              </div>
              <DoubleButton offsetColor="purple" size="sm" onClick={reset}>Reset</DoubleButton>
              {status !== 'correct' && (
                <DoubleButton offsetColor="green" size="sm" onClick={showHint} disabled={isDisabled}>Hint</DoubleButton>
              )}
              <DoubleButton offsetColor="green" size="sm" onClick={nextPuzzle}>
                {status === 'correct' ? 'Next →' : 'Skip →'}
              </DoubleButton>
            </div>
          )}

          {/* Mobile: buttons below board */}
          {isMobile && (
            <div className="flex gap-2">
              <DoubleButton offsetColor="purple" size="sm" onClick={reset}>Reset</DoubleButton>
              {status !== 'correct' && (
                <DoubleButton offsetColor="green" size="sm" onClick={showHint} disabled={isDisabled}>Hint</DoubleButton>
              )}
              <DoubleButton offsetColor="green" size="sm" onClick={nextPuzzle}>
                {status === 'correct' ? 'Next →' : 'Skip →'}
              </DoubleButton>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}