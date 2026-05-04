import { useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { Chess } from 'chess.js'
import type { Square } from 'chess.js'
import type { SquareHandlerArgs, PieceDropHandlerArgs } from 'react-chessboard'

interface ChessBoardProps {
  position: string
  orientation?: 'white' | 'black'
  onMove?: (move: { from: string; to: string; promotion?: string }) => boolean
  disabled?: boolean
  lastMove?: { from: string; to: string } | null
}

export default function ChessBoard({
  position,
  orientation = 'white',
  onMove,
  disabled = false,
  lastMove = null,
}: ChessBoardProps) {
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({})
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null)

  const game = new Chess(position)

  function getMoveOptions(square: Square) {
    const moves = game.moves({ square, verbose: true })
    if (!moves.length) return

    const options: Record<string, React.CSSProperties> = {}
    moves.forEach((move) => {
      const targetPiece = game.get(move.to as Square)
      const sourcePiece = game.get(square)
      options[move.to] = {
        background:
          targetPiece && targetPiece.color !== sourcePiece?.color
            ? 'radial-gradient(circle, rgba(255,59,48,0.4) 60%, transparent 62%)'
            : 'radial-gradient(circle, rgba(20,241,149,0.3) 30%, transparent 32%)',
        borderRadius: '50%',
      }
    })
    options[square] = { background: 'rgba(153,69,255,0.25)' }
    setOptionSquares(options)
  }

  function handleSquareClick({ square }: SquareHandlerArgs) {
    if (disabled) return

    if (selectedSquare) {
      const move = { from: selectedSquare, to: square as string, promotion: 'q' }
      const success = onMove?.(move)
      if (success) {
        setSelectedSquare(null)
        setOptionSquares({})
        return
      }
    }

    const piece = game.get(square as Square)
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square as Square)
      getMoveOptions(square as Square)
    } else {
      setSelectedSquare(null)
      setOptionSquares({})
    }
  }

  function handlePieceDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean {
    if (disabled || !targetSquare) return false
    const result = onMove?.({ from: sourceSquare, to: targetSquare, promotion: 'q' }) ?? false
    if (result) {
      setOptionSquares({})
      setSelectedSquare(null)
    }
    return result
  }

  const squareStyles: Record<string, React.CSSProperties> = {
    ...optionSquares,
    ...(lastMove
      ? {
          [lastMove.from]: { background: 'rgba(255,215,0,0.2)' },
          [lastMove.to]: { background: 'rgba(255,215,0,0.35)' },
        }
      : {}),
  }

  return (
    <div className="w-full max-w-[560px] mx-auto" aria-label="Chess board">
      <Chessboard
        options={{
          position,
          boardOrientation: orientation,
          onSquareClick: handleSquareClick,
          onPieceDrop: handlePieceDrop,
          squareStyles,
          darkSquareStyle: { backgroundColor: '#4a3728' },
          lightSquareStyle: { backgroundColor: '#c8a97e' },
          allowDragging: !disabled,
          animationDurationInMs: 150,
        }}
      />
    </div>
  )
}
