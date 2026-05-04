import { useParams } from 'react-router-dom'
import { useState } from 'react'
import { Chessboard } from 'react-chessboard'
import MoveHistory from '../components/chess/MoveHistory'
import LiveIndicator from '../components/ui/LiveIndicator'
import Avatar from '../components/ui/Avatar'
import { useChessGame } from '../hooks/useChessGame'
import { useGameStore } from '../stores/gameStore'
import { useEffect } from 'react'
import type { Player } from '../types'
import DoubleButton from '../components/ui/DoubleButton'

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

const SUPPORT_CHIPS = [0.01, 0.05, 0.1, 0.25]

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

// ─── Left panel: stakes + pool support ───────────────────────────────────────

// Clamp to 2dp, min 0.01
function sanitizeAmount(raw: string): number | null {
  const v = parseFloat(parseFloat(raw).toFixed(2))
  return isNaN(v) || v < 0.01 ? null : v
}

function LeftPanel({
  supportPool,
  stakesWhite,
  stakesBlack,
  onStake,
  onSupport,
}: {
  supportPool: number
  stakesWhite: number
  stakesBlack: number
  onStake: (side: 'white' | 'black', amount: number) => void
  onSupport: (amount: number) => void
}) {
  const [activeTab, setActiveTab] = useState<'stake' | 'support'>('stake')
  const [stakeInput, setStakeInput] = useState('')
  const [stakeError, setStakeError] = useState('')
  const [supportInput, setSupportInput] = useState('')
  const [supportError, setSupportError] = useState('')

  const totalStaked = stakesWhite + stakesBlack
  const whitePct = totalStaked > 0 ? (stakesWhite / totalStaked) * 100 : 50
  const blackPct = 100 - whitePct

  function handleStake(side: 'white' | 'black') {
    const v = sanitizeAmount(stakeInput)
    if (!v) { setStakeError('Min 0.01 SOL, max 2 decimal places'); return }
    setStakeError('')
    onStake(side, v)
    setStakeInput('')
  }

  function handleSupport(amount: number) {
    onSupport(amount)
  }

  function handleCustomSupport() {
    const v = sanitizeAmount(supportInput)
    if (!v) { setSupportError('Min 0.01 SOL, max 2 decimal places'); return }
    setSupportError('')
    onSupport(v)
    setSupportInput('')
  }

  return (
    <div
      className="flex flex-col gap-3 h-full p-2"
      style={{ background: '#13131a', border: '1.5px solid #2a2a3a' }}
    >
      {/* Prize pool — support only */}
      <div
        className="flex flex-col items-center py-3 flex-shrink-0"
        style={{ background: '#0a0a0f', border: '1px solid #2a2a3a' }}
      >
        <p className="text-[9px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#8888aa' }}>
          Prize Pool
        </p>
        <p className="text-2xl font-bold" style={{ color: '#FFD700' }}>
          {supportPool.toFixed(2)}
          <span className="text-sm ml-1" style={{ color: '#8888aa' }}>SOL</span>
        </p>
        <p className="text-[9px] mt-0.5" style={{ color: '#55556a' }}>Community supported · Winner takes all</p>
      </div>

      {/* Stake split bar */}
      <div className="flex flex-col gap-1 flex-shrink-0">
        <div className="flex justify-between text-[9px]">
          <span style={{ color: '#9945FF' }}>♔ {whitePct.toFixed(0)}%</span>
          <span style={{ color: '#14F195' }}>♚ {blackPct.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden flex" style={{ background: '#2a2a3a' }}>
          <div className="h-full transition-all duration-500" style={{ width: `${whitePct}%`, background: '#9945FF' }} />
          <div className="h-full transition-all duration-500" style={{ width: `${blackPct}%`, background: '#14F195' }} />
        </div>
        <div className="flex justify-between text-[9px]" style={{ color: '#8888aa' }}>
          <span>{stakesWhite.toFixed(2)} SOL</span>
          <span>{stakesBlack.toFixed(2)} SOL</span>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex overflow-hidden flex-shrink-0"
        style={{ background: '#0a0a0f', border: '1px solid #2a2a3a' }}
      >
        {(['stake', 'support'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-all"
            style={{
              background: activeTab === tab ? (tab === 'stake' ? 'rgba(153,69,255,0.15)' : 'rgba(255,215,0,0.1)') : 'transparent',
              color: activeTab === tab ? (tab === 'stake' ? '#9945FF' : '#FFD700') : '#8888aa',
            }}
          >
            {tab === 'stake' ? 'Stake' : 'Support'}
          </button>
        ))}
      </div>

      {/* Stake tab */}
      {activeTab === 'stake' && (
        <div className="flex flex-col gap-3 flex-1">
          <p className="text-[9px]" style={{ color: '#8888aa' }}>
            Enter an amount and pick your side. You profit if your pick wins.
          </p>

          {/* Single input */}
          <div
            className="flex items-center overflow-hidden"
            style={{ border: `1px solid ${stakeError ? '#FF3B30' : '#2a2a3a'}`, background: '#0a0a0f' }}
          >
            <span className="pl-2 text-[10px]" style={{ color: '#8888aa' }}>SOL</span>
            <input
              type="number" min="0.01" step="0.01"
              value={stakeInput}
              onChange={e => { setStakeInput(e.target.value); setStakeError('') }}
              onKeyDown={e => e.key === 'Enter' && handleStake('white')}
              placeholder="0.01"
              className="flex-1 px-2 py-2 text-sm font-mono font-bold bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              style={{ color: '#FFD700' }}
            />
          </div>
          {stakeError && <p className="text-[9px]" style={{ color: '#FF3B30' }}>{stakeError}</p>}

          {/* Side buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleStake('white')}
              className="flex-1 py-2.5 text-xs font-bold transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'rgba(153,69,255,0.12)', border: '1.5px solid #9945FF', color: '#9945FF' }}
            >
              ♔ White
            </button>
            <button
              onClick={() => handleStake('black')}
              className="flex-1 py-2.5 text-xs font-bold transition-all hover:opacity-90 active:scale-95"
              style={{ background: 'rgba(20,241,149,0.1)', border: '1.5px solid #14F195', color: '#14F195' }}
            >
              ♚ Black
            </button>
          </div>

          <p className="text-[9px] text-center" style={{ color: '#55556a' }}>
            Winnings paid on-chain · Min 0.01 SOL
          </p>
        </div>
      )}

      {/* Support tab */}
      {activeTab === 'support' && (
        <div className="flex flex-col gap-3 flex-1">
          <p className="text-[9px] leading-relaxed" style={{ color: '#8888aa' }}>
            Add to the prize pool. No profit for you — 100% goes to the winner.
          </p>

          <div className="grid grid-cols-2 gap-1.5">
            {SUPPORT_CHIPS.map(c => (
              <button key={c} onClick={() => handleSupport(c)}
                className="py-2 text-[10px] font-bold transition-all hover:opacity-80"
                style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)', color: '#FFD700' }}
              >
                {c} SOL
              </button>
            ))}
          </div>

          <div
            className="flex items-center overflow-hidden"
            style={{ border: `1px solid ${supportError ? '#FF3B30' : '#2a2a3a'}`, background: '#0a0a0f' }}
          >
            <span className="pl-2 text-[10px]" style={{ color: '#8888aa' }}>SOL</span>
            <input
              type="number" min="0.01" step="0.01"
              value={supportInput}
              onChange={e => { setSupportInput(e.target.value); setSupportError('') }}
              onKeyDown={e => e.key === 'Enter' && handleCustomSupport()}
              placeholder="0.01"
              className="flex-1 px-2 py-2 text-sm font-mono font-bold bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              style={{ color: '#FFD700' }}
            />
            <button
              onClick={handleCustomSupport}
              className="px-3 py-2 text-[9px] font-bold"
              style={{ background: 'rgba(255,215,0,0.15)', color: '#FFD700', borderLeft: '1px solid #2a2a3a' }}
            >
              Add
            </button>
          </div>
          {supportError && <p className="text-[9px]" style={{ color: '#FF3B30' }}>{supportError}</p>}

			<div>
				<DoubleButton offsetColor='random' className='w-full'>
					Support
				</DoubleButton>
			</div>
			


          <p className="text-[9px] text-center" style={{ color: '#55556a' }}>
            100% to prize pool · No fees
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Player row ───────────────────────────────────────────────────────────────

function PlayerRow({ player, color, timeSeconds, isActive }: {
  player: Player; color: 'white' | 'black'; timeSeconds: number; isActive: boolean
}) {
  const isLow = timeSeconds < 30
  return (
    <div
      className="flex items-center justify-between px-4 py-2 flex-shrink-0 transition-all duration-300"
      style={{
        background: isActive ? (color === 'white' ? 'rgba(20,241,149,0.06)' : 'rgba(153,69,255,0.08)') : '#13131a',
        border: `1.5px solid ${isActive ? (color === 'white' ? '#14F195' : '#9945FF') : '#2a2a3a'}`,
      }}
    >
      <div className="flex items-center gap-2">
        <Avatar username={player.username} size="md" />
        <div>
          <p className="text-sm font-semibold text-white">{player.username}</p>
          <p className="text-[10px]" style={{ color: '#8888aa' }}>Trust {player.trustScore}</p>
        </div>
        <span className="text-base">{color === 'white' ? '♔' : '♚'}</span>
      </div>
      <div className="flex items-center gap-2">
        {isActive && <LiveIndicator size="sm" showText={false} />}
        <div
          className="px-3 py-1 rounded-lg font-mono font-bold text-sm tabular-nums"
          style={{
            background: '#0a0a0f',
            border: `1px solid ${isLow ? '#FF3B30' : isActive ? (color === 'white' ? '#14F195' : '#9945FF') : '#2a2a3a'}`,
            color: isLow ? '#FF3B30' : isActive ? (color === 'white' ? '#14F195' : '#9945FF') : '#ffffff',
          }}
        >
          {fmt(timeSeconds)}
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GamePage() {
  const { id } = useParams<{ id: string }>()
  const { makeMove, board, moveHistory, currentTurn } = useChessGame()
  const { setGame, setStatus, gameStatus, stakes, lastMove } = useGameStore()

  useEffect(() => {
    if (id) { setGame(id, MOCK_WHITE, MOCK_BLACK); setStatus('active') }
  }, [id, setGame, setStatus])

  const turn = currentTurn()
  const [supportPool, setSupportPool] = useState(0)

  function handleStake(side: 'white' | 'black', amount: number) {
    useGameStore.getState().addStake(side, amount)
  }

  function handleSupport(amount: number) {
    setSupportPool(p => parseFloat((p + amount).toFixed(2)))
  }

  const squareStyles: Record<string, React.CSSProperties> = lastMove ? {
    [lastMove.from]: { background: 'rgba(255,215,0,0.25)' },
    [lastMove.to]: { background: 'rgba(255,215,0,0.4)' },
  } : {}

  return (
    <div className="flex gap-3 px-4 py-3 h-[calc(100vh-140px)]">

      {/* Left: stake + support */}
      <div className="w-[200px] flex-shrink-0">
        <LeftPanel
          supportPool={supportPool}
          stakesWhite={stakes.white}
          stakesBlack={stakes.black}
          onStake={handleStake}
          onSupport={handleSupport}
        />
      </div>

      {/* Centre: board + player rows */}
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <PlayerRow player={MOCK_BLACK} color="black" timeSeconds={300} isActive={turn === 'black' && gameStatus === 'active'} />

        <div className="flex-1 flex items-center justify-center min-h-0">
          <div
            className="overflow-hidden"
            style={{
              border: '2px solid #2a2a3a',
              width: 'min(100%, calc(100vh - 320px))',
              height: 'min(100%, calc(100vh - 320px))',
              aspectRatio: '1',
            }}
          >
            <Chessboard
              options={{
                position: board,
                boardOrientation: 'white',
                onSquareClick: ({ square }) => {
                  // handled internally via useChessGame via onMove
                },
                onPieceDrop: ({ sourceSquare, targetSquare }) =>
                  makeMove({ from: sourceSquare, to: targetSquare, promotion: 'q' }),
                allowDragging: turn === 'white' && gameStatus === 'active',
                squareStyles,
                darkSquareStyle: { backgroundColor: '#4a3728' },
                lightSquareStyle: { backgroundColor: '#c8a97e' },
                animationDurationInMs: 150,
                boardStyle: { width: '100%', height: '100%' },
              }}
            />
          </div>
        </div>

        <PlayerRow player={MOCK_WHITE} color="white" timeSeconds={300} isActive={turn === 'white' && gameStatus === 'active'} />
      </div>

      {/* Right: move history */}
      <div
        className="w-[180px] flex-shrink-0 flex flex-col overflow-hidden"
        style={{ background: '#13131a', border: '1.5px solid #2a2a3a' }}
      >
        <div className="px-3 py-2 flex-shrink-0" style={{ borderBottom: '1px solid #2a2a3a' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>Moves</p>
        </div>
        <div className="flex-1 overflow-hidden p-2">
          <MoveHistory moves={moveHistory} />
        </div>
      </div>

    </div>
  )
}
