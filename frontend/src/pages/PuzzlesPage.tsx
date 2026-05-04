import { useState } from 'react'
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

export default function PuzzlesPage() {
  const [puzzleIndex, setPuzzleIndex] = useState(0)
  const [board, setBoard] = useState(MOCK_PUZZLES[0].fen)
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle')
  const [solutionStep, setSolutionStep] = useState(0)

  const puzzle = MOCK_PUZZLES[puzzleIndex]

  function handleMove(move: { from: string; to: string; promotion?: string }): boolean {
    try {
      const game = new Chess(board)
      const result = game.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' })
      if (!result) return false

      const expected = puzzle.solution[solutionStep]
      const made = `${move.from}${move.to}`

      if (made === expected) {
        setBoard(game.fen())
        if (solutionStep + 1 >= puzzle.solution.length) {
          setStatus('correct')
        } else {
          setSolutionStep((s) => s + 1)
        }
        return true
      } else {
        setStatus('wrong')
        setTimeout(() => setStatus('idle'), 1200)
        return true
      }
    } catch {
      return false
    }
  }

  function nextPuzzle() {
    const next = (puzzleIndex + 1) % MOCK_PUZZLES.length
    setPuzzleIndex(next)
    setBoard(MOCK_PUZZLES[next].fen)
    setStatus('idle')
    setSolutionStep(0)
  }

  function reset() {
    setBoard(puzzle.fen)
    setStatus('idle')
    setSolutionStep(0)
  }

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Daily Puzzle</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={DIFFICULTY_COLORS[puzzle.difficulty]}>
                {puzzle.difficulty}
              </Badge>
              <Badge variant="gray">{puzzle.theme}</Badge>
            </div>
          </div>
          <p className="text-sm" style={{ color: '#8888aa' }}>
            Puzzle {puzzleIndex + 1} / {MOCK_PUZZLES.length}
          </p>
        </div>

        {status !== 'idle' && (
          <div
            className="mb-4 p-3 rounded-xl text-center text-sm font-semibold"
            style={{
              background: status === 'correct' ? 'rgba(20,241,149,0.1)' : 'rgba(255,59,48,0.1)',
              border: `1px solid ${status === 'correct' ? '#14F195' : '#FF3B30'}`,
              color: status === 'correct' ? '#14F195' : '#FF3B30',
            }}
          >
            {status === 'correct' ? '✓ Correct! Well done.' : '✗ Not the best move. Try again.'}
          </div>
        )}

        <ChessBoard
          position={board}
          orientation={puzzle.orientation}
          onMove={handleMove}
          disabled={status === 'correct'}
        />

        <div className="flex gap-3 mt-4">
          <DoubleButton offsetColor="purple" size="md" onClick={reset} className="flex-1">
            Reset
          </DoubleButton>
          {status === 'correct' && (
            <DoubleButton offsetColor="green" size="md" onClick={nextPuzzle} className="flex-1">
              Next Puzzle →
            </DoubleButton>
          )}
        </div>
      </div>
    </div>
  )
}
