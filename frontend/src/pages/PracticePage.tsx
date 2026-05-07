import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ChessBoard from '../components/chess/ChessBoard'
import PlayerCard from '../components/chess/PlayerCard'
import MoveHistory from '../components/chess/MoveHistory'
import DoubleButton from '../components/ui/DoubleButton'
import PracticeFriendModal from '../components/modals/PracticeFriendModal'
import { useChessGame } from '../hooks/useChessGame'
import { useGameStore } from '../stores/gameStore'
import { useStockfish, type Difficulty } from '../hooks/useStockfish'
import { useUserStore } from '../stores/userStore'
import { useAuthStore } from '../stores/authStore'
import type { Player } from '../types'

const DIFFICULTIES: { label: Difficulty; desc: string; color: string }[] = [
  { label: 'Beginner',     desc: 'Just learning',    color: '#14F195' },
  { label: 'Intermediate', desc: 'Know the basics',  color: '#FFD700' },
  { label: 'Advanced',     desc: 'Competitive play', color: '#FF8C42' },
  { label: 'Master',       desc: 'Brutal difficulty', color: '#FF3B30' },
]

const COLORS = [
  { value: 'white' as const, label: '♔ White', desc: 'Play first' },
  { value: 'black' as const, label: '♚ Black', desc: 'Respond' },
]

function makeAiPlayer(difficulty: Difficulty): Player {
  const trustByDifficulty: Record<Difficulty, number> = {
    Beginner: 30, Intermediate: 60, Advanced: 85, Master: 99,
  }
  return {
    wallet: 'ai-engine',
    username: `Solana AI · ${difficulty}`,
    trustScore: trustByDifficulty[difficulty],
    stats: { gamesPlayed: 9999, gamesWon: 0, winRate: 0, totalEarnings: 0 },
  }
}

// ─── Setup screen ─────────────────────────────────────────────────────────────

interface SetupProps {
  onStart: (difficulty: Difficulty, color: 'white' | 'black') => void
}

function SetupScreen({ onStart }: SetupProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('Intermediate')
  const [color, setColor] = useState<'white' | 'black'>('white')
  const [friendModalOpen, setFriendModalOpen] = useState(false)
  const { status } = useAuthStore()
  const isAuth = status === 'authenticated'

  return (
    <div className="flex flex-col items-center justify-center min-h-full py-12 px-4 gap-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Practice</h1>
        <p className="text-sm" style={{ color: '#8888aa' }}>
          No stakes, no leaderboard — just chess.
        </p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-6">
        {/* AI section */}
        <div
          className="flex flex-col gap-4 p-4"
          style={{ background: '#13131a', border: '1.5px solid #2a2a3a' }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
            ⚙ vs AI
          </p>

          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-widest" style={{ color: '#555577' }}>Difficulty</p>
            <div className="grid grid-cols-2 gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.label}
                  onClick={() => setDifficulty(d.label)}
                  className="flex flex-col items-start px-3 py-2 transition-all duration-150 text-left"
                  style={{
                    background: difficulty === d.label ? `${d.color}14` : '#0a0a0f',
                    border: `1.5px solid ${difficulty === d.label ? d.color : '#2a2a3a'}`,
                    boxShadow: difficulty === d.label ? `0 0 12px ${d.color}30` : 'none',
                  }}
                  aria-pressed={difficulty === d.label}
                >
                  <span className="text-xs font-semibold" style={{ color: difficulty === d.label ? d.color : '#ffffff' }}>
                    {d.label}
                  </span>
                  <span className="text-[10px]" style={{ color: '#8888aa' }}>{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[10px] uppercase tracking-widest" style={{ color: '#555577' }}>Play as</p>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className="flex-1 flex flex-col items-center py-2.5 transition-all duration-150"
                  style={{
                    background: color === c.value ? 'rgba(153,69,255,0.12)' : '#0a0a0f',
                    border: `1.5px solid ${color === c.value ? '#9945FF' : '#2a2a3a'}`,
                    boxShadow: color === c.value ? '0 0 12px rgba(153,69,255,0.25)' : 'none',
                  }}
                  aria-pressed={color === c.value}
                >
                  <span className="text-sm mb-0.5">{c.label}</span>
                  <span className="text-[9px]" style={{ color: '#8888aa' }}>{c.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <DoubleButton offsetColor="purple" size="md" icon="♟" onClick={() => onStart(difficulty, color)} className="w-full">
            Start vs AI
          </DoubleButton>
        </div>

        {/* Friend section */}
        <div
          className="flex flex-col gap-3 p-4"
          style={{ background: '#13131a', border: '1.5px solid #2a2a3a' }}
        >
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
            ♥ vs Friend
          </p>
          <p className="text-xs" style={{ color: '#555577' }}>
            Private game with a friend using a shareable code. Timed or free play.
          </p>
          <DoubleButton
            offsetColor="green"
            size="md"
            icon="♟"
            onClick={() => setFriendModalOpen(true)}
            className="w-full"
            disabled={!isAuth}
          >
            {isAuth ? 'Create Friend Game' : 'Connect wallet to play'}
          </DoubleButton>
        </div>
      </div>

      <PracticeFriendModal open={friendModalOpen} onClose={() => setFriendModalOpen(false)} />
    </div>
  )
}

// ─── Winner overlay ───────────────────────────────────────────────────────────

function WinnerOverlay({
  winner,
  playerColor,
  onRematch,
  onQuit,
}: {
  winner: 'white' | 'black' | 'draw'
  playerColor: 'white' | 'black'
  onRematch: () => void
  onQuit: () => void
}) {
  const isWin = winner === playerColor
  const isDraw = winner === 'draw'

  const emoji = isDraw ? '🤝' : isWin ? '🏆' : '💀'
  const title = isDraw ? 'Draw!' : isWin ? 'You Win!' : 'You Lose'
  const color = isDraw ? '#FFD700' : isWin ? '#14F195' : '#FF3B30'

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10"
      style={{ background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(4px)' }}
    >
      <div className="text-6xl">{emoji}</div>
      <h2 className="text-3xl font-bold" style={{ color }}>{title}</h2>
      {!isDraw && (
        <p className="text-sm" style={{ color: '#8888aa' }}>
          {isWin ? 'Great game!' : 'Better luck next time.'}
        </p>
      )}
      <div className="flex gap-3 mt-2">
        <button
          onClick={onRematch}
          className="px-6 py-2.5 font-bold text-sm transition-all hover:opacity-90"
          style={{ background: color, color: '#0a0a0f' }}
        >
          Rematch
        </button>
        <button
          onClick={onQuit}
          className="px-6 py-2.5 font-bold text-sm transition-all hover:opacity-90"
          style={{ background: '#13131a', border: '1.5px solid #2a2a3a', color: '#8888aa' }}
        >
          Quit
        </button>
      </div>
    </div>
  )
}

// ─── Game ─────────────────────────────────────────────────────────────────────

interface GameConfig {
  difficulty: Difficulty
  playerColor: 'white' | 'black'
}

function PracticeGame({
  config,
  onQuit,
  onChangeDifficulty,
}: {
  config: GameConfig
  onQuit: () => void
  onChangeDifficulty: (d: Difficulty) => void
}) {
  const { difficulty, playerColor } = config
  const { username } = useUserStore()
  const { makeMove, board, moveHistory, currentTurn } = useChessGame()
  const { setStatus, resetGame, undoMoves, lastMove, winner, gameStatus, fenHistory } = useGameStore()
  const aiThinkingRef = useRef(false)

  const aiColor: 'white' | 'black' = playerColor === 'white' ? 'black' : 'white'

  const humanPlayer: Player = {
    wallet: 'player',
    username: username ?? 'You',
    trustScore: 50,
    stats: { gamesPlayed: 0, gamesWon: 0, winRate: 0, totalEarnings: 0 },
  }
  const aiPlayer = makeAiPlayer(difficulty)

  const { requestMove } = useStockfish({
    difficulty,
    onMove: (from, to, promotion) => {
      aiThinkingRef.current = false
      makeMove({ from, to, promotion })
    },
  })

  useEffect(() => {
    resetGame()
    setStatus('active')
  }, [])

  useEffect(() => {
    if (gameStatus !== 'active' || winner) return
    const turn = currentTurn()
    if (turn === aiColor && !aiThinkingRef.current) {
      aiThinkingRef.current = true
      setTimeout(() => requestMove(board), 400)
    }
  }, [board, gameStatus, winner])

  function handlePlayerMove(move: { from: string; to: string; promotion?: string }): boolean {
    if (currentTurn() !== playerColor) return false
    return makeMove(move)
  }

  function handleRematch() {
    resetGame()
    setStatus('active')
    aiThinkingRef.current = false
  }

  // Undo 2 plies (player move + AI response) so it's the player's turn again
  function handleUndo() {
    if (aiThinkingRef.current) return
    const plies = fenHistory.length > 2 ? 2 : fenHistory.length - 1
    if (plies < 1) return
    undoMoves(plies)
  }

  const canUndo = !winner && fenHistory.length > 1 && !aiThinkingRef.current

  const isPlayerTurn = gameStatus === 'active' && currentTurn() === playerColor
  const topInfo = { player: aiPlayer, color: aiColor }
  const bottomInfo = { player: humanPlayer, color: playerColor }

  return (
    <div className="flex gap-4 px-4 py-4 h-[calc(100vh-140px)]">
      {/* Board + players */}
      <div className="flex flex-col gap-3 flex-1 min-w-0">
        <PlayerCard
          player={topInfo.player}
          color={topInfo.color}
          isActive={gameStatus === 'active' && currentTurn() === topInfo.color}
          showTimer={false}
        />

        <div className="relative flex-1 flex items-center justify-center min-h-0 overflow-hidden">
          <div style={{ width: 'min(100%, calc(100vh - 300px))', aspectRatio: '1 / 1' }}>
            <ChessBoard
              position={board}
              orientation={playerColor}
              onMove={handlePlayerMove}
              disabled={!isPlayerTurn}
              lastMove={lastMove}
            />
          </div>
          {winner && (
            <WinnerOverlay
              winner={winner}
              playerColor={playerColor}
              onRematch={handleRematch}
              onQuit={onQuit}
            />
          )}
        </div>

        <PlayerCard
          player={bottomInfo.player}
          color={bottomInfo.color}
          isActive={isPlayerTurn}
          showTimer={false}
        />
      </div>

      {/* Sidebar: difficulty + moves + controls */}
      <div className="w-[180px] flex-shrink-0 flex flex-col gap-2">
        {/* Difficulty switcher */}
        <div
          className="p-3 flex flex-col gap-1.5"
          style={{ background: '#13131a', border: '1.5px solid #2a2a3a' }}
        >
          <p className="text-[9px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#8888aa' }}>
            Difficulty
          </p>
          {DIFFICULTIES.map((d) => (
            <button
              key={d.label}
              onClick={() => onChangeDifficulty(d.label)}
              className="w-full text-left px-2 py-1 text-xs transition-all"
              style={{
                background: difficulty === d.label ? `${d.color}18` : 'transparent',
                border: `1px solid ${difficulty === d.label ? d.color : 'transparent'}`,
                color: difficulty === d.label ? d.color : '#8888aa',
              }}
            >
              {d.label}
            </button>
          ))}
        </div>

        {/* Move history */}
        <div
          className="flex-1 overflow-hidden p-3"
          style={{ background: '#13131a', border: '1.5px solid #2a2a3a' }}
        >
          <p className="text-[9px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#8888aa' }}>
            Moves
          </p>
          <MoveHistory moves={moveHistory} />
        </div>

        {/* Controls */}
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className="w-full py-2 text-xs font-semibold transition-all"
          style={{
            background: '#13131a',
            border: `1.5px solid ${canUndo ? '#9945FF' : '#2a2a3a'}`,
            color: canUndo ? '#9945FF' : '#444466',
            cursor: canUndo ? 'pointer' : 'not-allowed',
          }}
        >
          ↩ Undo Move
        </button>
        <button
          onClick={onQuit}
          className="w-full py-2 text-xs font-semibold transition-all hover:opacity-80"
          style={{ background: '#13131a', border: '1.5px solid #2a2a3a', color: '#8888aa' }}
        >
          Quit
        </button>
      </div>
    </div>
  )
}

// ─── Page root ────────────────────────────────────────────────────────────────

export default function PracticePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const navState = location.state as { difficulty?: Difficulty; color?: 'white' | 'black' } | null

  const [config, setConfig] = useState<GameConfig | null>(
    navState?.difficulty && navState?.color
      ? { difficulty: navState.difficulty, playerColor: navState.color }
      : null,
  )

  function handleStart(difficulty: Difficulty, color: 'white' | 'black') {
    setConfig({ difficulty, playerColor: color })
  }

  function handleQuit() {
    setConfig(null)
    navigate('/practice', { replace: true, state: null })
  }

  function handleChangeDifficulty(d: Difficulty) {
    if (!config || d === config.difficulty) return
    // Switching difficulty starts a fresh game with same color
    setConfig({ ...config, difficulty: d })
  }

  if (!config) {
    return <SetupScreen onStart={handleStart} />
  }

  return (
    <PracticeGame
      key={`${config.difficulty}-${config.playerColor}`}
      config={config}
      onQuit={handleQuit}
      onChangeDifficulty={handleChangeDifficulty}
    />
  )
}