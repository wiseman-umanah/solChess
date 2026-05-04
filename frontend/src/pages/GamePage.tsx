import { useParams } from 'react-router-dom'
import ChessBoard from '../components/chess/ChessBoard'
import PlayerCard from '../components/chess/PlayerCard'
import MoveHistory from '../components/chess/MoveHistory'
import GameInfo from '../components/chess/GameInfo'
import StakePanel from '../components/staking/StakePanel'
import { useChessGame } from '../hooks/useChessGame'
import { useGameStore } from '../stores/gameStore'
import { useEffect } from 'react'
import type { Player } from '../types'

const MOCK_WHITE: Player = {
  wallet: 'GmX1...9kPq',
  username: 'GrandmasterX',
  trustScore: 98,
  stats: { gamesPlayed: 142, gamesWon: 89, winRate: 63, totalEarnings: 12.48 },
}

const MOCK_BLACK: Player = {
  wallet: 'SoK2...3mRt',
  username: 'SolKnight',
  trustScore: 95,
  stats: { gamesPlayed: 210, gamesWon: 130, winRate: 62, totalEarnings: 8.21 },
}

export default function GamePage() {
  const { id } = useParams<{ id: string }>()
  const { makeMove, board, moveHistory, currentTurn } = useChessGame()
  const { setGame, setStatus, gameStatus, prizePool, stakes, spectatorCount, lastMove } = useGameStore()

  useEffect(() => {
    if (id) {
      setGame(id, MOCK_WHITE, MOCK_BLACK)
      setStatus('active')
    }
  }, [id, setGame, setStatus])

  const turn = currentTurn()

  function handleStake(side: 'white' | 'black', amount: number) {
    useGameStore.getState().addStake(side, amount)
  }

  return (
    <div className="flex gap-4 px-4 py-4 h-[calc(100vh-140px)]">
      {/* Main board area */}
      <div className="flex flex-col gap-3 flex-1">
        {/* Game info bar */}
        <GameInfo
          prizePool={prizePool}
          stakesWhite={stakes.white}
          stakesBlack={stakes.black}
          spectatorCount={spectatorCount}
        />

        {/* Opponent (black) */}
        <PlayerCard
          player={MOCK_BLACK}
          color="black"
          timeSeconds={180}
          isActive={turn === 'black' && gameStatus === 'active'}
        />

        {/* Board */}
        <ChessBoard
          position={board}
          orientation="white"
          onMove={makeMove}
          disabled={turn !== 'white' || gameStatus !== 'active'}
          lastMove={lastMove}
        />

        {/* Player (white) */}
        <PlayerCard
          player={MOCK_WHITE}
          color="white"
          timeSeconds={300}
          isActive={turn === 'white' && gameStatus === 'active'}
        />
      </div>

      {/* Right panel: move history + stake panel */}
      <div className="flex flex-col gap-4 w-[200px]">
        <div
          className="flex-1 rounded-xl p-3 overflow-hidden"
          style={{ background: '#13131a', border: '1.5px solid #2a2a3a' }}
        >
          <MoveHistory moves={moveHistory} />
        </div>

        <div
          className="rounded-xl p-3"
          style={{ background: '#13131a', border: '1.5px solid #2a2a3a' }}
        >
          <StakePanel
            prizePool={prizePool}
            stakesWhite={stakes.white}
            stakesBlack={stakes.black}
            onStake={handleStake}
          />
        </div>
      </div>
    </div>
  )
}
