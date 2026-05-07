import { useState, useEffect, useCallback } from 'react'
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

const MOCK_PUZZLES: Puzzle[] = [
  {
    id: '1',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    solution: ['f3g5', 'f6e4', 'g5f7'],
    difficulty: 'medium',
    theme: 'Fork',
    orientation: 'white',
  },
  {
    id: '2',
    fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    solution: ['e1e8'],
    difficulty: 'easy',
    theme: 'Back Rank Mate',
    orientation: 'white',
  },
]

const DIFFICULTY_COLORS = {
  easy: 'green' as const,
  medium: 'purple' as const,
  hard: 'gold' as const,
}

function parseUci(uci: string) {
  return { from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }
}

export default function PuzzlesPage() {
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const [board, setBoard] = useState(MOCK_PUZZLES[0].fen)
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong' | 'waiting'>('idle')
  const [solutionStep, setSolutionStep] = useState(0)
  const [hintSquare, setHintSquare] = useState<string | null>(null)
  const [hintUsed, setHintUsed] = useState(false)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)

  const puzzle = MOCK_PUZZLES[puzzleIndex]

  const playOpponentMove = useCallback((currentFen: string, step: number) => {
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

  useEffect(() => {
    setBoard(puzzle.fen)
    setStatus('idle')
    setSolutionStep(0)
    setHintSquare(null)
    setHintUsed(false)
    setLastMove(null)
  }, [puzzle])

  function handleMove(move: { from: string; to: string; promotion?: string }): boolean {
    if (status === 'waiting' || status === 'correct') return false
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
    const { from } = parseUci(puzzle.solution[solutionStep])
    setHintSquare(from)
    setHintUsed(true)
    setTimeout(() => setHintSquare(null), 2500)
  }

  function nextPuzzle() {
    setPuzzleIndex((i) => (i + 1) % MOCK_PUZZLES.length)
  }

  function reset() {
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
  const playerMovesLeft = Math.ceil((puzzle.solution.length - solutionStep) / 2)

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8">
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
            <p className="text-sm" style={{ color: '#8888aa' }}>
              Puzzle {puzzleIndex + 1} / {MOCK_PUZZLES.length}
            </p>
            {status !== 'correct' && (
              <p className="text-[11px] mt-0.5" style={{ color: '#555577' }}>
                {playerMovesLeft} move{playerMovesLeft !== 1 ? 's' : ''} to find
              </p>
            )}
          </div>
        </div>

        {/* Board + side buttons */}
        <div className="flex items-stretch gap-3">
          <div className="flex-1 min-w-0">
            <ChessBoard
              position={board}
              orientation={puzzle.orientation}
              onMove={handleMove}
              disabled={isDisabled}
              lastMove={lastMove}
              customSquares={customSquares}
            />
          </div>

          {/* Side panel — status + buttons, pinned to board height */}
          <div className="flex flex-col gap-2.5" style={{ width: 110, flexShrink: 0 }}>
            {/* Status indicator — always present, no layout shift */}
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
              {status === 'correct'  ? '✓ Brilliant!'
              : status === 'wrong'   ? '✗ Try again'
              : status === 'waiting' ? 'Opponent…'
              : 'Find the best move'}
            </div>

            <DoubleButton offsetColor="purple" size="sm" onClick={reset}>Reset</DoubleButton>

            {status !== 'correct' && (
              <DoubleButton offsetColor="green" size="sm" onClick={showHint} disabled={isDisabled}>
                Hint
              </DoubleButton>
            )}

            <DoubleButton offsetColor="green" size="sm" onClick={nextPuzzle}>
              {status === 'correct' ? 'Next →' : 'Skip →'}
            </DoubleButton>
          </div>
        </div>

      </div>
    </div>
  )
}