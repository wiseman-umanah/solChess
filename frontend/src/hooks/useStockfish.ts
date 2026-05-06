import { useEffect, useRef, useCallback } from 'react'
import { Chess } from 'chess.js'

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Master'

const DIFFICULTY_CONFIG: Record<Difficulty, { skill: number; depth: number }> = {
  Beginner:     { skill: 0,  depth: 1  },
  Intermediate: { skill: 5,  depth: 8  },
  Advanced:     { skill: 13, depth: 15 },
  Master:       { skill: 20, depth: 20 },
}

interface UseStockfishProps {
  difficulty: Difficulty
  onMove: (from: string, to: string, promotion?: string) => void
}

export function useStockfish({ difficulty, onMove }: UseStockfishProps) {
  const workerRef = useRef<Worker | null>(null)
  const onMoveRef = useRef(onMove)
  onMoveRef.current = onMove

  useEffect(() => {
    let worker: Worker | null = null
    try {
      worker = new Worker('/stockfish.js')
      workerRef.current = worker

      const { skill } = DIFFICULTY_CONFIG[difficulty]

      worker.onmessage = (e: MessageEvent) => {
        const line: string = typeof e.data === 'string' ? e.data : ''
        if (line === 'uciok') {
          worker!.postMessage(`setoption name Skill Level value ${skill}`)
          worker!.postMessage('isready')
        }
        if (line.startsWith('bestmove')) {
          const move = line.split(' ')[1]
          if (!move || move === '(none)') return
          onMoveRef.current(move.slice(0, 2), move.slice(2, 4), move[4] || undefined)
        }
      }

      worker.onerror = () => {
        // Worker failed — fall back to random moves
        workerRef.current = null
      }

      worker.postMessage('uci')
    } catch {
      workerRef.current = null
    }

    return () => {
      worker?.postMessage('quit')
      worker?.terminate()
      workerRef.current = null
    }
  }, [difficulty])

  const requestMove = useCallback(
    (fen: string) => {
      const worker = workerRef.current
      if (worker) {
        const { depth } = DIFFICULTY_CONFIG[difficulty]
        worker.postMessage(`position fen ${fen}`)
        worker.postMessage(`go depth ${depth}`)
      } else {
        // Fallback: pick a random legal move
        const chess = new Chess(fen)
        const moves = chess.moves({ verbose: true })
        if (!moves.length) return
        const move = moves[Math.floor(Math.random() * moves.length)]
        const delay = difficulty === 'Beginner' ? 300 : 600
        setTimeout(() => onMoveRef.current(move.from, move.to, move.promotion ?? undefined), delay)
      }
    },
    [difficulty],
  )

  return { requestMove }
}