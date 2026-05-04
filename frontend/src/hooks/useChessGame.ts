import { useCallback } from 'react'
import { Chess } from 'chess.js'
import { useGameStore } from '../stores/gameStore'
import type { Move } from '../types'

export function useChessGame() {
  const { board, moveHistory, addMove, setBoard, setWinner, gameStatus } = useGameStore()

  const makeMove = useCallback(
    (move: { from: string; to: string; promotion?: string }): boolean => {
      if (gameStatus !== 'active') return false

      try {
        const game = new Chess(board)
        const result = game.move({ from: move.from, to: move.to, promotion: move.promotion ?? 'q' })

        if (!result) return false

        const newMove: Move = {
          from: result.from,
          to: result.to,
          san: result.san,
          piece: result.piece,
          color: result.color,
          timestamp: Date.now(),
        }

        addMove(newMove)
        setBoard(game.fen())

        if (game.isCheckmate()) {
          setWinner(result.color === 'w' ? 'white' : 'black')
        } else if (game.isDraw()) {
          setWinner('draw')
        }

        return true
      } catch {
        return false
      }
    },
    [board, gameStatus, addMove, setBoard, setWinner]
  )

  const getLegalMoves = useCallback(
    (square: string): string[] => {
      try {
        const game = new Chess(board)
        return game.moves({ square: square as Parameters<typeof game.moves>[0]['square'], verbose: true }).map((m) => m.to)
      } catch {
        return []
      }
    },
    [board]
  )

  const isCheck = useCallback((): boolean => {
    try {
      return new Chess(board).inCheck()
    } catch {
      return false
    }
  }, [board])

  const currentTurn = useCallback((): 'white' | 'black' => {
    try {
      return new Chess(board).turn() === 'w' ? 'white' : 'black'
    } catch {
      return 'white'
    }
  }, [board])

  return { makeMove, getLegalMoves, isCheck, currentTurn, moveHistory, board }
}
