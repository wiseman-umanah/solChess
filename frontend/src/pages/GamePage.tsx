import { useParams, useNavigate } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useIsMobile } from '../hooks/useIsMobile'
import ChessBoard from '../components/chess/ChessBoard'
import MoveHistory from '../components/chess/MoveHistory'
import LiveIndicator from '../components/ui/LiveIndicator'
import Avatar from '../components/ui/Avatar'
import DoubleButton from '../components/ui/DoubleButton'
import { useChessGame } from '../hooks/useChessGame'
import { useGameStore } from '../stores/gameStore'
import { useUserStore } from '../stores/userStore'
import { api } from '../lib/apiClient'
import { socket } from '../lib/socket'
import { useAnchorWallet } from '@solana/wallet-adapter-react'
import { placeStakeOnChain, addToSupportPool, claimStakeWinnings } from '../lib/anchorProgram'
import SEO, { BASE_URL } from '../components/SEO'
import type { Player } from '../types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GameData {
  id: string
  code: string
  whiteWallet: string | null
  blackWallet: string | null
  fen: string
  status: 'WAITING' | 'ACTIVE' | 'ENDED'
  timeControl: number | null
  isPractice: boolean
  isHosted: boolean
  hostWallet: string | null
  creatorColor: string
  prizePool: number
  stakesWhite: number
  stakesBlack: number
  wager: number
  winner: string | null
  endReason: string | null
  white: Player | null
  black: Player | null
  moves: { from: string; to: string; san: string; piece: string; color: string }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`
}

function truncate(wallet: string) {
  return `${wallet.slice(0, 5)}…${wallet.slice(-4)}`
}

function displayName(p: Player | null, wallet: string | null) {
  if (!wallet) return '—'
  return p?.username ?? truncate(wallet)
}

const SUPPORT_CHIPS = [0.01, 0.05, 0.1, 0.25]

function sanitizeAmount(raw: string): number | null {
  const v = parseFloat(parseFloat(raw).toFixed(2))
  return isNaN(v) || v < 0.01 ? null : v
}

// ─── Winner overlay ───────────────────────────────────────────────────────────

function WinnerOverlay({
  winner,
  reason,
  playerColor,
  isPractice,
  onRematch,
  onLeave,
}: {
  winner: string
  reason: string | null
  playerColor: 'white' | 'black' | null
  isPractice: boolean
  onRematch?: () => void
  onLeave: () => void
}) {
  const isWin = playerColor && winner === playerColor
  const isDraw = winner === 'draw'
  const emoji = isDraw ? '🤝' : isWin ? '🏆' : playerColor ? '💀' : '🏁'
  const title = isDraw ? 'Draw!' : isWin ? 'You Win!' : playerColor ? 'You Lose' : `${winner.charAt(0).toUpperCase() + winner.slice(1)} Wins`
  const color = isDraw ? '#FFD700' : (isWin || !playerColor) ? '#14F195' : '#FF3B30'
  const reasonLabel = reason === 'checkmate' ? 'by checkmate' : reason === 'timeout' ? 'on time' : reason === 'resign' ? 'by resignation' : reason === 'disconnect' ? 'opponent disconnected' : reason ?? ''

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10"
      style={{ background: 'rgba(10,10,15,0.9)', backdropFilter: 'blur(4px)' }}
    >
      <div className="text-6xl">{emoji}</div>
      <h2 className="text-3xl font-bold" style={{ color }}>{title}</h2>
      {reasonLabel && <p className="text-sm capitalize" style={{ color: '#8888aa' }}>{reasonLabel}</p>}
      <div className="flex gap-3 mt-2">
        {isPractice && onRematch && (
          <button
            onClick={onRematch}
            className="px-6 py-2.5 font-bold text-sm"
            style={{ background: color, color: '#0a0a0f' }}
          >
            Rematch
          </button>
        )}
        <button
          onClick={onLeave}
          className="px-6 py-2.5 font-bold text-sm"
          style={{ background: '#13131a', border: '1.5px solid #2a2a3a', color: '#8888aa' }}
        >
          Leave
        </button>
      </div>
    </div>
  )
}

// ─── Opponent disconnected banner ─────────────────────────────────────────────

function DisconnectBanner({ isPractice, isUntimed }: { isPractice: boolean; isUntimed: boolean }) {
  if (!isPractice) return null
  return (
    <div
      className="px-4 py-2 text-xs font-semibold text-center"
      style={{ background: 'rgba(255,140,66,0.12)', border: '1px solid #FF8C42', color: '#FF8C42' }}
    >
      {isUntimed
        ? 'Opponent disconnected. Game is paused — they can rejoin anytime.'
        : 'Opponent disconnected. They have 30s to reconnect or you win.'}
    </div>
  )
}

// ─── Undo request banner ──────────────────────────────────────────────────────

function UndoBanner({
  byWallet,
  onAccept,
  onDecline,
}: {
  byWallet: string
  onAccept: () => void
  onDecline: () => void
}) {
  const [countdown, setCountdown] = useState(15)

  useEffect(() => {
    const t = setInterval(() => setCountdown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div
      className="px-4 py-3 flex items-center justify-between gap-3"
      style={{ background: 'rgba(153,69,255,0.1)', border: '1px solid #9945FF' }}
    >
      <p className="text-xs" style={{ color: '#9945FF' }}>
        {truncate(byWallet)} wants to undo their last move
        <span className="ml-2 opacity-60">({countdown}s)</span>
      </p>
      <div className="flex gap-2 flex-shrink-0">
        <button
          onClick={onAccept}
          className="px-3 py-1 text-xs font-bold"
          style={{ background: 'rgba(20,241,149,0.15)', border: '1px solid #14F195', color: '#14F195' }}
        >
          Accept
        </button>
        <button
          onClick={onDecline}
          className="px-3 py-1 text-xs font-bold"
          style={{ background: 'rgba(255,59,48,0.1)', border: '1px solid #FF3B30', color: '#FF3B30' }}
        >
          Decline
        </button>
      </div>
    </div>
  )
}

// ─── Left panel (public games only) ──────────────────────────────────────────

function LeftPanel({
  gameId,
  supportPool,
  stakesWhite,
  stakesBlack,
  wager,
  isPlayer,
  isEnded,
  winner,
}: {
  gameId: string
  supportPool: number
  stakesWhite: number
  stakesBlack: number
  wager: number
  isPlayer: boolean
  isEnded: boolean
  winner: string | null
}) {
  const anchorWallet = useAnchorWallet()
  const [activeTab, setActiveTab] = useState<'stake' | 'support'>('stake')
  const [stakeInput, setStakeInput] = useState('')
  const [stakeError, setStakeError] = useState('')
  const [supportInput, setSupportInput] = useState('')
  const [supportError, setSupportError] = useState('')
  const [stakeLoading, setStakeLoading] = useState(false)
  const [supportLoading, setSupportLoading] = useState(false)
  const [stakedSide, setStakedSide] = useState<'white' | 'black' | null>(null)
  const [claimLoading, setClaimLoading] = useState(false)
  const [claimError, setClaimError] = useState('')
  const [claimed, setClaimed] = useState(false)
  const [localStakesW, setLocalStakesW] = useState(stakesWhite)
  const [localStakesB, setLocalStakesB] = useState(stakesBlack)
  const [localPool, setLocalPool] = useState(supportPool)

  // Sync from parent when socket-driven updates arrive
  useEffect(() => { setLocalStakesW(stakesWhite) }, [stakesWhite])
  useEffect(() => { setLocalStakesB(stakesBlack) }, [stakesBlack])
  useEffect(() => { setLocalPool(supportPool) }, [supportPool])

  const totalStaked = localStakesW + localStakesB
  const whitePct = totalStaked > 0 ? (localStakesW / totalStaked) * 100 : 50
  const blackPct = 100 - whitePct

  async function handleStake(side: 'white' | 'black') {
    const v = sanitizeAmount(stakeInput)
    if (!v) { setStakeError('Min 0.01 SOL, max 2 decimal places'); return }
    if (!anchorWallet) { setStakeError('Connect your wallet to stake'); return }
    setStakeError('')
    setStakeLoading(true)
    try {
      if (wager > 0) {
        await placeStakeOnChain(anchorWallet, gameId, side, v)
      }
      await api.post(`/api/v1/games/${gameId}/stake`, { side, amount: v })
      if (side === 'white') setLocalStakesW(p => parseFloat((p + v).toFixed(4)))
      else setLocalStakesB(p => parseFloat((p + v).toFixed(4)))
      setStakedSide(side)
      setStakeInput('')
    } catch (e: unknown) {
      setStakeError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setStakeLoading(false)
    }
  }

  async function handleClaim() {
    if (!anchorWallet) { setClaimError('Connect a wallet to claim'); return }
    setClaimLoading(true)
    setClaimError('')
    try {
      await claimStakeWinnings(anchorWallet, gameId)
      setClaimed(true)
    } catch (e: unknown) {
      setClaimError(e instanceof Error ? e.message : 'Claim failed')
    } finally {
      setClaimLoading(false)
    }
  }

  async function handleSupport(amount: number) {
    if (!anchorWallet) { setSupportError('Connect your wallet to contribute'); return }
    setSupportError('')
    setSupportLoading(true)
    try {
      if (wager > 0) {
        await addToSupportPool(anchorWallet, gameId, amount)
      }
      await api.post(`/api/v1/games/${gameId}/support`, { amount })
      setLocalPool(p => parseFloat((p + amount).toFixed(4)))
    } catch (e: unknown) {
      setSupportError(e instanceof Error ? e.message : 'Failed')
    } finally {
      setSupportLoading(false)
    }
  }

  async function handleCustomSupport() {
    const v = sanitizeAmount(supportInput)
    if (!v) { setSupportError('Min 0.01 SOL, max 2 decimal places'); return }
    setSupportError('')
    await handleSupport(v)
    setSupportInput('')
  }

  return (
    <div className="flex flex-col gap-3 h-full p-2" style={{ background: '#13131a', border: '1.5px solid #2a2a3a' }}>
      <div className="flex flex-col items-center py-3 flex-shrink-0" style={{ background: '#0a0a0f', border: '1px solid #2a2a3a' }}>
        <p className="text-[9px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: '#8888aa' }}>Prize Pool</p>
        <p className="text-2xl font-bold" style={{ color: '#FFD700' }}>
          {(wager + localPool).toFixed(4)}<span className="text-sm ml-1" style={{ color: '#8888aa' }}>SOL</span>
        </p>
        {wager > 0 && localPool > 0 && (
          <p className="text-[9px] mt-0.5" style={{ color: '#55556a' }}>
            {wager.toFixed(4)} wager · {localPool.toFixed(4)} community
          </p>
        )}
        {wager > 0 && localPool === 0 && (
          <p className="text-[9px] mt-0.5" style={{ color: '#55556a' }}>Player wagers · Winner takes all minus 3%</p>
        )}
        {wager === 0 && (
          <p className="text-[9px] mt-0.5" style={{ color: '#55556a' }}>Community supported · Winner takes all</p>
        )}
      </div>

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
          <span>{localStakesW.toFixed(2)} SOL</span>
          <span>{localStakesB.toFixed(2)} SOL</span>
        </div>
      </div>

      <div className="flex overflow-hidden flex-shrink-0" style={{ background: '#0a0a0f', border: '1px solid #2a2a3a' }}>
        {(['stake', 'support'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="flex-1 py-1.5 text-[10px] font-semibold uppercase tracking-widest transition-all"
            style={{
              background: activeTab === tab ? (tab === 'stake' ? 'rgba(153,69,255,0.15)' : 'rgba(255,215,0,0.1)') : 'transparent',
              color: activeTab === tab ? (tab === 'stake' ? '#9945FF' : '#FFD700') : '#8888aa',
            }}
          >{tab}</button>
        ))}
      </div>

      {activeTab === 'stake' && (
        <div className="flex flex-col gap-3 flex-1">
          {stakedSide ? (
            <div className="flex flex-col items-center justify-center gap-2 flex-1 py-4"
              style={{ background: '#0a0a0f', border: `1px solid ${stakedSide === 'white' ? '#9945FF' : '#14F195'}` }}>
              <p className="text-xs font-bold" style={{ color: stakedSide === 'white' ? '#9945FF' : '#14F195' }}>
                {stakedSide === 'white' ? '♔' : '♚'} Staked on {stakedSide === 'white' ? 'White' : 'Black'}
              </p>
              <p className="text-[9px]" style={{ color: '#8888aa' }}>You'll earn if your pick wins</p>
            </div>
          ) : (
            <>
              <p className="text-[9px]" style={{ color: '#8888aa' }}>Enter amount and pick a side. You profit if your pick wins.</p>
              <div className="flex items-center overflow-hidden" style={{ border: `1px solid ${stakeError ? '#FF3B30' : '#2a2a3a'}`, background: '#0a0a0f' }}>
                <span className="pl-2 text-[10px]" style={{ color: '#8888aa' }}>SOL</span>
                <input type="number" min="0.01" step="0.01" value={stakeInput}
                  onChange={e => { setStakeInput(e.target.value); setStakeError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleStake('white')}
                  placeholder="0.01"
                  className="flex-1 px-2 py-2 text-sm font-mono font-bold bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ color: '#FFD700' }}
                />
              </div>
              {stakeError && <p className="text-[9px]" style={{ color: '#FF3B30' }}>{stakeError}</p>}
              <div className="flex gap-2">
                <button onClick={() => handleStake('white')} disabled={stakeLoading}
                  className="flex-1 py-2.5 text-xs font-bold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'rgba(153,69,255,0.12)', border: '1.5px solid #9945FF', color: '#9945FF' }}>
                  {stakeLoading ? '…' : '♔ White'}
                </button>
                <button onClick={() => handleStake('black')} disabled={stakeLoading}
                  className="flex-1 py-2.5 text-xs font-bold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'rgba(20,241,149,0.1)', border: '1.5px solid #14F195', color: '#14F195' }}>
                  {stakeLoading ? '…' : '♚ Black'}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'support' && (
        <div className="flex flex-col gap-3 flex-1">
          <p className="text-[9px] leading-relaxed" style={{ color: '#8888aa' }}>Add to the prize pool. Goes to the winner on-chain.</p>
          <div className="grid grid-cols-2 gap-1.5">
            {SUPPORT_CHIPS.map(c => (
              <button key={c} onClick={() => handleSupport(c)} disabled={supportLoading}
                className="py-2 text-[10px] font-bold transition-all hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'rgba(255,215,0,0.08)', border: '1px solid rgba(255,215,0,0.25)', color: '#FFD700' }}
              >{supportLoading ? '…' : `${c} SOL`}</button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center overflow-hidden" style={{ border: `1px solid ${supportError ? '#FF3B30' : '#2a2a3a'}`, background: '#0a0a0f' }}>
              <span className="pl-2 text-[10px]" style={{ color: '#8888aa' }}>SOL</span>
              <input type="number" min="0.01" step="0.01" value={supportInput}
                onChange={e => { setSupportInput(e.target.value); setSupportError('') }}
                onKeyDown={e => e.key === 'Enter' && handleCustomSupport()}
                placeholder="Custom amount"
                className="flex-1 px-2 py-2 text-sm font-mono font-bold bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                style={{ color: '#FFD700' }}
              />
            </div>
            {supportInput && (
              <button onClick={handleCustomSupport} disabled={supportLoading}
                className="w-full py-2 text-[10px] font-bold transition-all hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.4)', color: '#FFD700' }}>
                {supportLoading ? 'Confirming…' : `Contribute ${supportInput} SOL →`}
              </button>
            )}
          </div>
          {supportError && <p className="text-[9px]" style={{ color: '#FF3B30' }}>{supportError}</p>}
        </div>
      )}

      {/* Claim winnings — shown when game ended with wager and user is a spectator */}
      {isEnded && wager > 0 && !isPlayer && (
        <div className="flex flex-col gap-1.5 flex-shrink-0 mt-auto pt-2" style={{ borderTop: '1px solid #2a2a3a' }}>
          {claimed ? (
            <p className="text-[10px] text-center font-semibold" style={{ color: '#14F195' }}>
              ✓ Winnings claimed!
            </p>
          ) : (
            <>
              <p className="text-[9px] text-center" style={{ color: '#8888aa' }}>
                {winner ? `${winner.charAt(0).toUpperCase() + winner.slice(1)} won` : 'Game over'} · Claim your stake payout
              </p>
              <button
                onClick={handleClaim}
                disabled={claimLoading}
                className="w-full py-2.5 text-xs font-bold transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'rgba(20,241,149,0.1)', border: '1.5px solid #14F195', color: '#14F195' }}
              >
                {claimLoading ? '…' : '⬇ Claim Winnings'}
              </button>
              {claimError && <p className="text-[9px]" style={{ color: '#FF3B30' }}>{claimError}</p>}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Player row ───────────────────────────────────────────────────────────────

function PlayerRow({
  player, wallet, color, timeSeconds, isActive, showTimer,
}: {
  player: Player | null
  wallet: string | null
  color: 'white' | 'black'
  timeSeconds: number
  isActive: boolean
  showTimer: boolean
}) {
  const name = displayName(player, wallet)
  const trust = player?.trustScore ?? '—'
  const isLow = timeSeconds < 30
  const accentColor = color === 'white' ? '#14F195' : '#9945FF'

  return (
    <div
      className="flex items-center justify-between px-4 py-2 flex-shrink-0 transition-all duration-300"
      style={{
        background: isActive ? `${accentColor}10` : '#13131a',
        border: `1.5px solid ${isActive ? accentColor : '#2a2a3a'}`,
      }}
    >
      <div className="flex items-center gap-2">
        <Avatar username={name} size="md" />
        <div>
          <p className="text-sm font-semibold text-white">{name}</p>
          <p className="text-[10px]" style={{ color: '#8888aa' }}>Trust {trust}</p>
        </div>
        <span className="text-base">{color === 'white' ? '♔' : '♚'}</span>
      </div>
      <div className="flex items-center gap-2">
        {isActive && <LiveIndicator size="sm" showText={false} />}
        {showTimer && (
          <div
            className="px-3 py-1 font-mono font-bold text-sm tabular-nums"
            style={{
              background: '#0a0a0f',
              border: `1px solid ${isLow ? '#FF3B30' : isActive ? accentColor : '#2a2a3a'}`,
              color: isLow ? '#FF3B30' : isActive ? accentColor : '#ffffff',
            }}
          >
            {fmt(timeSeconds)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Waiting room (practice friend only) ─────────────────────────────────────

function WaitingRoom({ code, onCancel }: { code: string; onCancel: () => void }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
      <div className="text-5xl">⏳</div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-1">Waiting for opponent</h2>
        <p className="text-sm" style={{ color: '#8888aa' }}>Share this code with your friend</p>
      </div>
      <div className="flex flex-col items-center gap-3 py-6 px-10" style={{ background: '#0a0a0f', border: '1.5px solid #2a2a3a' }}>
        <span className="text-3xl font-mono font-bold tracking-widest" style={{ color: '#14F195', letterSpacing: '0.15em' }}>{code}</span>
        <button onClick={copy} className="px-4 py-1.5 text-xs font-semibold transition-all"
          style={{ background: copied ? 'rgba(20,241,149,0.15)' : 'transparent', border: `1px solid ${copied ? '#14F195' : '#2a2a3a'}`, color: copied ? '#14F195' : '#8888aa' }}>
          {copied ? '✓ Copied!' : 'Copy Code'}
        </button>
      </div>
      <button onClick={onCancel} className="text-xs" style={{ color: '#8888aa' }}>Cancel game</button>
    </div>
  )
}

// ─── Waiting room (public game) ───────────────────────────────────────────────

function PublicWaitingRoom({
  code,
  gameId,
  isHosted = false,
  onBack,
}: {
  code: string | null
  gameId: string
  isHosted?: boolean
  onBack: () => void
}) {
  const [codeCopied, setCodeCopied] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  function copyCode() {
    if (!code) return
    navigator.clipboard.writeText(code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/games/${gameId}`)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-6">
      <div className="text-5xl">⏳</div>
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-1">
          {isHosted ? 'Waiting for players' : 'Waiting for opponent'}
        </h2>
        <p className="text-sm" style={{ color: '#8888aa' }}>
          {isHosted
            ? (code ? 'Share the code with both players' : 'The game will start once both players have joined')
            : (code ? 'Share the code with your opponent' : 'The game will start once both players have joined')}
        </p>
      </div>

      {code && (
        <div
          className="flex flex-col items-center gap-3 py-5 px-10"
          style={{ background: '#0a0a0f', border: '1.5px solid #2a2a3a' }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#555577' }}>
            {isHosted ? 'Player Code' : 'Opponent Code'}
          </p>
          <span
            className="text-3xl font-mono font-bold tracking-widest"
            style={{ color: '#9945FF', letterSpacing: '0.15em' }}
          >
            {code}
          </span>
          {isHosted && (
            <p className="text-[10px] text-center" style={{ color: '#8888aa' }}>
              First to join = white · Second to join = black
            </p>
          )}
          <button
            onClick={copyCode}
            className="px-4 py-1.5 text-xs font-semibold transition-all"
            style={{
              background: codeCopied ? 'rgba(153,69,255,0.15)' : 'transparent',
              border: `1px solid ${codeCopied ? '#9945FF' : '#2a2a3a'}`,
              color: codeCopied ? '#9945FF' : '#8888aa',
            }}
          >
            {codeCopied ? '✓ Copied!' : 'Copy Code'}
          </button>
        </div>
      )}

      {/* Spectator share link — always visible */}
      <button
        onClick={copyLink}
        className="flex items-center gap-2 px-4 py-2 text-xs font-semibold transition-all"
        style={{
          background: linkCopied ? 'rgba(20,241,149,0.1)' : '#13131a',
          border: `1px solid ${linkCopied ? '#14F195' : '#2a2a3a'}`,
          color: linkCopied ? '#14F195' : '#8888aa',
        }}
      >
        <span>🔗</span>
        {linkCopied ? 'Spectator link copied!' : 'Copy spectator link'}
      </button>

      {code && !isHosted && (
        <p className="text-xs text-center max-w-xs" style={{ color: '#444466' }}>
          Only the first person to join by code becomes your opponent. Anyone with the link can spectate.
        </p>
      )}

      <button onClick={onBack} className="text-xs mt-2" style={{ color: '#555577' }}>← Back to games</button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GamePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { wallet } = useUserStore()
  const isMobile = useIsMobile()


  const [game, setGame] = useState<GameData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Live timer state (seconds remaining per side)
  const [timerWhite, setTimerWhite] = useState(0)
  const [timerBlack, setTimerBlack] = useState(0)

  // Practice-specific UI state
  const [undoRequester, setUndoRequester] = useState<string | null>(null)
  const [opponentDisconnected, setOpponentDisconnected] = useState(false)
  const [bothConnected, setBothConnected] = useState(false)

  const { makeMove, board, moveHistory, currentTurn } = useChessGame()
  const { setGame: storeSetGame, setStatus, setBoard, addMove, setWinner, resetGame, lastMove, winner, gameStatus } = useGameStore()

  const gameRef = useRef<GameData | null>(null)
  gameRef.current = game

  // Tracks the move we sent locally so we can skip the echo from opponent-move
  const pendingMoveRef = useRef<{ from: string; to: string } | null>(null)

  // ── Derived ────────────────────────────────────────────────────────────────

  const playerColor: 'white' | 'black' | null = !wallet ? null
    : game?.whiteWallet === wallet ? 'white'
    : game?.blackWallet === wallet ? 'black'
    : null

  const isMyTurn = playerColor !== null && gameStatus === 'active' && currentTurn() === playerColor
  const isTimed = !!game?.timeControl
  const isPractice = !!game?.isPractice
  const isWaiting = game?.status === 'WAITING'

  // ── Load game ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return
    setLoading(true)
    api.get<GameData>(`/api/v1/games/${id}`)
      .then(data => {
        setGame(data)
        if (data.timeControl) {
          setTimerWhite(data.timeControl)
          setTimerBlack(data.timeControl)
        }
        // Restore board state from server.
        // storeSetGame resets gameStatus → 'waiting', so call it FIRST then override.
        resetGame()
        if (data.white && data.black) storeSetGame(data.id, data.white, data.black)
        setBoard(data.fen)
        if (data.status === 'ACTIVE') setStatus('active')
        if (data.status === 'ENDED' && data.winner) setWinner(data.winner as 'white' | 'black' | 'draw')
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Game not found'))
      .finally(() => setLoading(false))
  }, [id])

  // ── Socket ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!id) return

    // Connect for spectators (authenticated users reconnect via useSocketLifecycle)
    if (!socket.connected) socket.connect()

    const joinGame = () => socket.emit('join-game', { gameId: id })
    joinGame()
    // Re-join on reconnect (e.g. user authenticates while on the page)
    socket.on('connect', joinGame)

    socket.on('game-state', (data: GameData) => {
      setGame(data)
      setBoard(data.fen)
      if (data.status === 'ACTIVE') setStatus('active')
      if (data.status === 'ENDED' && data.winner) setWinner(data.winner as 'white' | 'black' | 'draw')
      if (data.timeControl) {
        setTimerWhite(data.timeControl)
        setTimerBlack(data.timeControl)
      }
    })

    socket.on('both-connected', () => {
      setBothConnected(true)
      setOpponentDisconnected(false)
      setGame(prev => prev ? { ...prev, status: 'ACTIVE' } : prev)
      setStatus('active')
    })

    socket.on('game-start', (data: GameData) => {
      setGame(data)
      setStatus('active')
    })

    socket.on('opponent-move', ({ move, fen, turn }: { move: { from: string; to: string; san: string; piece: string; color: 'w' | 'b' }; fen: string; turn: string }) => {
      setBoard(fen)
      // Skip duplicate if this is our own move echoed back from the server
      const pending = pendingMoveRef.current
      if (pending && pending.from === move.from && pending.to === move.to) {
        pendingMoveRef.current = null
      } else {
        addMove({ ...move, timestamp: Date.now() })
      }
      setOpponentDisconnected(false)
      void turn
    })

    socket.on('timer-tick', ({ white, black }: { white: number; black: number }) => {
      setTimerWhite(white)
      setTimerBlack(black)
    })

    socket.on('game-end', ({ winner: w, reason }: { winner: string; reason: string }) => {
      setWinner(w as 'white' | 'black' | 'draw')
      setGame(prev => prev ? { ...prev, status: 'ENDED', winner: w, endReason: reason } : prev)
    })

    socket.on('undo-requested', ({ byWallet }: { byWallet: string }) => {
      setUndoRequester(byWallet)
      // Auto-clear after 16s (server auto-confirms at 15s)
      setTimeout(() => setUndoRequester(null), 16_000)
    })

    socket.on('undo-confirmed', ({ fen, moveCount }: { fen: string; moveCount: number }) => {
      setUndoRequester(null)
      setBoard(fen)
      // Trim move history to match
      useGameStore.setState(state => ({
        moveHistory: state.moveHistory.slice(0, moveCount),
        lastMove: moveCount > 0
          ? { from: state.moveHistory[moveCount - 1]?.from, to: state.moveHistory[moveCount - 1]?.to }
          : null,
        winner: null,
        gameStatus: 'active',
      }))
    })

    socket.on('undo-declined', () => {
      setUndoRequester(null)
    })

    socket.on('opponent-disconnected', () => {
      setOpponentDisconnected(true)
      setBothConnected(false)
    })

    socket.on('stake-update', ({ stakesWhite, stakesBlack }: { stakesWhite: number; stakesBlack: number }) => {
      setGame(prev => prev ? { ...prev, stakesWhite, stakesBlack } : prev)
    })

    socket.on('prize-pool-update', ({ prizePool }: { prizePool: number }) => {
      setGame(prev => prev ? { ...prev, prizePool } : prev)
    })

    socket.on('error', ({ message }: { message: string }) => {
      console.warn('Socket error:', message)
    })

    return () => {
      socket.off('connect', joinGame)
      socket.off('game-state')
      socket.off('both-connected')
      socket.off('game-start')
      socket.off('opponent-move')
      socket.off('timer-tick')
      socket.off('game-end')
      socket.off('undo-requested')
      socket.off('undo-confirmed')
      socket.off('undo-declined')
      socket.off('opponent-disconnected')
      socket.off('stake-update')
      socket.off('prize-pool-update')
      socket.off('error')
    }
  }, [id])

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleMove = useCallback((move: { from: string; to: string; promotion?: string }): boolean => {
    if (!isMyTurn || !id) return false
    const ok = makeMove(move)
    if (ok) {
      pendingMoveRef.current = { from: move.from, to: move.to }
      socket.emit('make-move', { gameId: id, ...move })
    }
    return ok
  }, [isMyTurn, id, makeMove])

  function handleResign() {
    if (!id) return
    socket.emit('resign', { gameId: id })
  }

  function handleRequestUndo() {
    if (!id) return
    socket.emit('request-undo', { gameId: id })
  }

  function handleRespondUndo(accept: boolean) {
    if (!id) return
    setUndoRequester(null)
    socket.emit('respond-undo', { gameId: id, accept })
  }

  function handleEndPractice() {
    if (!id) return
    socket.emit('end-practice', { gameId: id })
  }

  function handleLeave() {
    navigate(-1)
  }

  async function handleCancel() {
    if (!id) return
    try { await api.post(`/api/v1/games/${id}/cancel`) } catch { /* ignore */ }
    navigate(-1)
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm" style={{ color: '#8888aa' }}>Loading game...</p>
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-sm" style={{ color: '#FF3B30' }}>{error ?? 'Game not found'}</p>
        <button onClick={() => navigate(-1)} className="text-xs" style={{ color: '#8888aa' }}>← Go back</button>
      </div>
    )
  }

  // ── Waiting room for practice friend games ─────────────────────────────────

  if (isWaiting && isPractice) {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] px-4 py-4">
        <WaitingRoom code={game.code} onCancel={handleCancel} />
      </div>
    )
  }

  // ── Waiting for opponent in public game ────────────────────────────────────

  if (isWaiting && !isPractice) {
    // Players in a slot, or the host who created the game, can see the code
    const canSeeCode = playerColor !== null || (!!game.hostWallet && game.hostWallet === wallet)
    return (
      <PublicWaitingRoom
        code={canSeeCode ? game.code : null}
        gameId={game.id}
        isHosted={game.isHosted}
        onBack={() => navigate(-1)}
      />
    )
  }

  // ── Board orientation & timing ─────────────────────────────────────────────

  const orientation = playerColor ?? 'white'
  const topColor: 'white' | 'black' = orientation === 'white' ? 'black' : 'white'
  const bottomColor: 'white' | 'black' = orientation

  const topWallet = topColor === 'white' ? game.whiteWallet : game.blackWallet
  const bottomWallet = bottomColor === 'white' ? game.whiteWallet : game.blackWallet
  const topPlayer = topColor === 'white' ? game.white : game.black
  const bottomPlayer = bottomColor === 'white' ? game.white : game.black
  const topTime = topColor === 'white' ? timerWhite : timerBlack
  const bottomTime = bottomColor === 'white' ? timerWhite : timerBlack

  // Timer only shows when timed AND (for practice) both players are connected
  const showTimer = isTimed && (!isPractice || bothConnected || gameStatus === 'active')
  const turn = currentTurn()
  const isEnded = gameStatus === 'ended' || !!winner

  // Practice sidebar controls
  const canUndo = isPractice && playerColor !== null && moveHistory.length >= 2 && !isEnded && !undoRequester
  const isOwner = game.creatorColor === playerColor

  const whiteName = game?.white?.username ?? game?.whiteWallet?.slice(0, 6) ?? 'White'
  const blackName = game?.black?.username ?? game?.blackWallet?.slice(0, 6) ?? 'Black'
  const totalPot  = ((game?.wager ?? 0) + (game?.prizePool ?? 0)).toFixed(4)
  const gameTitle = game
    ? `${whiteName} vs ${blackName} — ${totalPot} SOL`
    : 'Live Chess Game'
  const gameDesc = game
    ? `Watch ${whiteName} vs ${blackName} live on SolChess. ${totalPot} SOL prize pool. Stake your pick on-chain.`
    : 'Live chess on Solana with on-chain wagers and staking.'
  return (
    <div className={isMobile
      ? "flex flex-col gap-3 px-2 py-2"
      : "flex gap-3 px-4 py-3 h-[calc(100vh-140px)]"
    }>
      <SEO
        title={gameTitle}
        description={gameDesc}
        url={`${BASE_URL}/games/${id}`}
      />

      {/* Left: stake panel (public) OR practice controls */}
      {!isMobile && <div className="w-[200px] flex-shrink-0 flex flex-col gap-2">
        {!isPractice ? (
          <LeftPanel
            gameId={game.id}
            supportPool={game.prizePool}
            stakesWhite={game.stakesWhite}
            stakesBlack={game.stakesBlack}
            wager={game.wager ?? 0}
            isPlayer={playerColor !== null}
            isEnded={isEnded}
            winner={game.winner}
          />
        ) : (
          <div className="flex flex-col gap-2 h-full">
            {/* Game info */}
            <div className="p-3 flex flex-col gap-2" style={{ background: '#13131a', border: '1.5px solid #2a2a3a' }}>
              <p className="text-[9px] font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>Practice Game</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: '#555577' }}>Code:</span>
                <span className="text-[10px] font-mono font-bold" style={{ color: '#14F195' }}>{game.code}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px]" style={{ color: '#555577' }}>Timer:</span>
                <span className="text-[10px]" style={{ color: isTimed ? '#9945FF' : '#8888aa' }}>
                  {isTimed ? `${Math.floor(game.timeControl! / 60)} min` : 'No timer'}
                </span>
              </div>
              {!isTimed && (
                <p className="text-[9px]" style={{ color: '#555577' }}>
                  Playing at your own pace.
                </p>
              )}
            </div>

            {/* Move history */}
            <div className="flex-1 overflow-hidden p-3" style={{ background: '#13131a', border: '1.5px solid #2a2a3a' }}>
              <p className="text-[9px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#8888aa' }}>Moves</p>
              <MoveHistory moves={moveHistory} />
            </div>

            {/* Practice actions */}
            {playerColor && !isEnded && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleRequestUndo}
                  disabled={!canUndo}
                  className="w-full py-2 text-xs font-semibold transition-all"
                  style={{
                    background: '#13131a',
                    border: `1.5px solid ${canUndo ? '#9945FF' : '#2a2a3a'}`,
                    color: canUndo ? '#9945FF' : '#444466',
                    cursor: canUndo ? 'pointer' : 'not-allowed',
                  }}
                >
                  ↩ Request Undo
                </button>
                {!isTimed && isOwner && (
                  <button
                    onClick={handleEndPractice}
                    className="w-full py-2 text-xs font-semibold transition-all hover:opacity-80"
                    style={{ background: '#13131a', border: '1.5px solid #FF8C42', color: '#FF8C42' }}
                  >
                    End Game
                  </button>
                )}
                <button
                  onClick={handleResign}
                  className="w-full py-2 text-xs font-semibold transition-all hover:opacity-80"
                  style={{ background: '#13131a', border: '1.5px solid #2a2a3a', color: '#8888aa' }}
                >
                  Resign
                </button>
              </div>
            )}
          </div>
        )}
      </div>}

      {/* Centre: board + players + banners */}
      <div className={isMobile ? "flex flex-col gap-2 w-full" : "flex flex-col gap-2 flex-1 min-w-0"}>

        {/* Disconnect banner */}
        {opponentDisconnected && <DisconnectBanner isPractice={isPractice} isUntimed={!isTimed} />}

        {/* Undo request banner */}
        {undoRequester && undoRequester !== wallet && (
          <UndoBanner
            byWallet={undoRequester}
            onAccept={() => handleRespondUndo(true)}
            onDecline={() => handleRespondUndo(false)}
          />
        )}

        <PlayerRow
          player={topPlayer}
          wallet={topWallet ?? null}
          color={topColor}
          timeSeconds={topTime}
          isActive={gameStatus === 'active' && turn === topColor}
          showTimer={showTimer}
        />

        <div className="flex items-center justify-center relative overflow-hidden">
          <div style={{ width: isMobile ? 'min(100vw - 16px, 480px)' : 'min(100%, calc(100vh - 300px))', aspectRatio: '1 / 1' }}>
            <ChessBoard
              position={board}
              orientation={orientation}
              onMove={handleMove}
              disabled={!isMyTurn || !!winner}
              lastMove={lastMove}
            />
          </div>
          {(isEnded || !!winner) && game.winner && (
            <WinnerOverlay
              winner={game.winner ?? winner ?? ''}
              reason={game.endReason}
              playerColor={playerColor}
              isPractice={isPractice}
              onLeave={handleLeave}
            />
          )}
        </div>

        <PlayerRow
          player={bottomPlayer}
          wallet={bottomWallet ?? null}
          color={bottomColor}
          timeSeconds={bottomTime}
          isActive={gameStatus === 'active' && turn === bottomColor}
          showTimer={showTimer}
        />

        {/* Spectator count (public games) */}
        {!isPractice && (
          <div className="flex items-center justify-center gap-1.5 py-1">
            <LiveIndicator size="sm" showText={false} />
            <span className="text-[10px]" style={{ color: '#555577' }}>
              {game.stakesWhite + game.stakesBlack > 0
                ? `${(game.stakesWhite + game.stakesBlack).toFixed(2)} SOL staked`
                : 'No stakes yet'}
            </span>
          </div>
        )}
      </div>

      {/* Right: move history (public) OR resign/info (practice) */}
      {!isPractice && !isMobile && (
        <div className="w-[180px] flex-shrink-0 flex flex-col gap-2">
          <div className="flex-1 overflow-hidden" style={{ background: '#13131a', border: '1.5px solid #2a2a3a' }}>
            <div className="px-3 py-2 flex-shrink-0" style={{ borderBottom: '1px solid #2a2a3a' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>Moves</p>
            </div>
            <div className="p-2">
              <MoveHistory moves={moveHistory} />
            </div>
          </div>
          {playerColor && !isEnded && (
            <DoubleButton offsetColor="purple" size="sm" onClick={handleResign} className="w-full">
              Resign
            </DoubleButton>
          )}
        </div>
      )}

    </div>
  )
}