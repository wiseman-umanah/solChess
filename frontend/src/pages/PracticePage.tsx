import { useState } from 'react'
import ChessBoard from '../components/chess/ChessBoard'
import PlayerCard from '../components/chess/PlayerCard'
import MoveHistory from '../components/chess/MoveHistory'
import DoubleButton from '../components/ui/DoubleButton'
import { useChessGame } from '../hooks/useChessGame'
import { useGameStore } from '../stores/gameStore'
import type { Player } from '../types'

const HUMAN_PLAYER: Player = {
  wallet: 'You...0000',
  username: 'You',
  trustScore: 75,
  stats: { gamesPlayed: 10, gamesWon: 6, winRate: 60, totalEarnings: 0 },
}

const AI_PLAYER: Player = {
  wallet: 'AI...0001',
  username: 'Solana AI',
  trustScore: 90,
  stats: { gamesPlayed: 9999, gamesWon: 7800, winRate: 78, totalEarnings: 0 },
}

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export default function PracticePage() {
  const [started, setStarted] = useState(false)
  const { makeMove, board, moveHistory, currentTurn } = useChessGame()
  const { setStatus, lastMove } = useGameStore()

  function startGame() {
    useGameStore.getState().setBoard(INITIAL_FEN)
    useGameStore.getState().resetGame()
    setStatus('active')
    setStarted(true)
  }

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full py-16 px-4 gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2">Practice</h1>
          <p className="text-sm" style={{ color: '#8888aa' }}>
            Play against AI or set up a private game with a friend.
          </p>
        </div>

        <div className="flex gap-4">
          <DoubleButton offsetColor="purple" size="lg" icon="⚙" onClick={startGame}>
            Practice vs AI
          </DoubleButton>
          <DoubleButton offsetColor="green" size="lg" icon="♥" onClick={startGame}>
            Play with Friend
          </DoubleButton>
        </div>
      </div>
    )
  }

  const turn = currentTurn()

  return (
    <div className="flex gap-4 px-4 py-4 h-[calc(100vh-140px)]">
      <div className="flex flex-col gap-3 flex-1">
        <PlayerCard
          player={AI_PLAYER}
          color="black"
          timeSeconds={600}
          isActive={turn === 'black'}
        />
        <ChessBoard
          position={board}
          orientation="white"
          onMove={makeMove}
          disabled={turn !== 'white'}
          lastMove={lastMove}
        />
        <PlayerCard
          player={HUMAN_PLAYER}
          color="white"
          timeSeconds={600}
          isActive={turn === 'white'}
        />
      </div>

      <div
        className="w-[180px] rounded-xl p-3 overflow-hidden"
        style={{ background: '#13131a', border: '1.5px solid #2a2a3a' }}
      >
        <MoveHistory moves={moveHistory} />
      </div>
    </div>
  )
}
