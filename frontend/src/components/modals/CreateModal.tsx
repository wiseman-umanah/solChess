import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../ui/Modal'
import { api } from '../../lib/apiClient'
import { useAuthStore } from '../../stores/authStore'
import { useAnchorWallet } from '@solana/wallet-adapter-react'
import { createEscrow } from '../../lib/anchorProgram'

type Mode = 'create' | 'host'

interface CreateModalProps {
  open: boolean
  mode: Mode
  onClose: () => void
}

const WAGER_CHIPS = [0.01, 0.05, 0.1, 0.25, 0.5, 1]

const TIME_OPTIONS = [
  { label: 'No timer', value: null },
  { label: '3 min',   value: 180  },
  { label: '5 min',   value: 300  },
  { label: '10 min',  value: 600  },
  { label: '15 min',  value: 900  },
  { label: '30 min',  value: 1800 },
]

const COLORS = [
  { value: 'white'  as const, label: '♔ White', desc: 'Move first'  },
  { value: 'black'  as const, label: '♚ Black', desc: 'Move second' },
  { value: 'random' as const, label: '⚄ Random', desc: 'Surprise me' },
]

type Step = 'config' | 'created'

export default function CreateModal({ open, mode, onClose }: CreateModalProps) {
  const navigate    = useNavigate()
  const { status }  = useAuthStore()
  const anchorWallet = useAnchorWallet()
  const isAuth      = status === 'authenticated'
  const isHost      = mode === 'host'

  const [step,        setStep]        = useState<Step>('config')
  const [timeControl, setTimeControl] = useState<number | null>(300)
  const [color,       setColor]       = useState<'white' | 'black' | 'random'>('white')
  const [wager,       setWager]       = useState<number | null>(null)
  const [customWager, setCustomWager] = useState('')
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [gameCode,    setGameCode]    = useState('')
  const [gameId,      setGameId]      = useState('')
  const [codeCopied,  setCodeCopied]  = useState(false)
  const [linkCopied,  setLinkCopied]  = useState(false)

  const accentColor = isHost ? '#14F195' : '#9945FF'

  function resolvedWager(): number {
    if (customWager) return parseFloat(customWager) || 0
    return wager ?? 0
  }

  async function handleCreate() {
    if (!isAuth) return
    const wagerSol = resolvedWager()
    if (!isHost && wagerSol === 0) {
      setError('Set a wager to create a game')
      return
    }
    if (wagerSol < 0.01) {
      setError('Minimum wager is 0.01 SOL')
      return
    }
    if (!anchorWallet) {
      setError('Connect a Solana wallet to play with a wager')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const resolvedColor = (!isHost && color === 'random')
        ? (Math.random() < 0.5 ? 'white' : 'black')
        : (isHost ? 'white' : color)

      // Step 1: lock wager on-chain BEFORE touching the backend.
      // If the user rejects or the tx fails, nothing gets created anywhere.
      let onChainGameId: string | null = null
      if (wagerSol > 0 && anchorWallet) {
        // Generate a stable ID client-side so the on-chain PDA seeds and the DB record share the same key.
        onChainGameId = crypto.randomUUID()
        try {
          await createEscrow(anchorWallet, onChainGameId, resolvedWager(), resolvedColor === 'white')
        } catch (e: unknown) {
          setError(`Transaction rejected: ${e instanceof Error ? e.message : 'escrow failed'}. No game was created.`)
          setLoading(false)
          return
        }
      }

      // Step 2: escrow confirmed (or no wager) — now create the backend record
      const res = await api.post<{ gameId: string; code: string; wager: number }>('/api/v1/games', {
        timeControl,
        isPractice: false,
        isHosted: isHost,
        creatorColor: resolvedColor,
        wager: resolvedWager(),
        ...(onChainGameId ? { gameId: onChainGameId } : {}),
      })

      setGameCode(res.code)
      setGameId(res.gameId)
      setStep('created')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create game')
    } finally {
      setLoading(false)
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(gameCode)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/games/${gameId}`)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  function handleEnter() {
    onClose()
    navigate(`/games/${gameId}`)
  }

  function handleClose() {
    setStep('config')
    setError(null)
    setWager(null)
    setCustomWager('')
    setCodeCopied(false)
    setLinkCopied(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose}>

      {/* Header */}
      <div className="flex items-center gap-3 pr-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}44` }}
        >
          {isHost ? '⬡' : '♟'}
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">
            {step === 'config' ? (isHost ? 'Host Event' : 'Create Game') : (isHost ? 'Event Created!' : 'Game Created!')}
          </h2>
          <p className="text-xs" style={{ color: '#8888aa' }}>
            {step === 'config'
              ? (isHost ? 'You watch · Two players join by code' : 'Public game · spectators welcome')
              : 'Share the code with your players'}
          </p>
        </div>
      </div>

      {step === 'config' ? (
        <>
          {/* Host-only info banner */}
          {isHost && (
            <div
              className="flex items-start gap-3 px-4 py-3"
              style={{ background: 'rgba(20,241,149,0.06)', border: '1px solid rgba(20,241,149,0.2)' }}
            >
              <span className="text-lg flex-shrink-0">👁</span>
              <div>
                <p className="text-xs font-semibold text-white">You are the host</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#8888aa' }}>
                  You will spectate only. Share the code with two players — the first to join gets white, the second gets black.
                </p>
              </div>
            </div>
          )}

          {/* Color picker — only for regular create */}
          {!isHost && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
                Play as
              </p>
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => setColor(c.value)}
                    className="flex-1 flex flex-col items-center py-2.5 transition-all duration-150"
                    style={{
                      background: color === c.value ? `${accentColor}12` : '#0a0a0f',
                      border: `1.5px solid ${color === c.value ? accentColor : '#2a2a3a'}`,
                      boxShadow: color === c.value ? `0 0 12px ${accentColor}28` : 'none',
                    }}
                    aria-pressed={color === c.value}
                  >
                    <span className="text-sm mb-0.5">{c.label}</span>
                    <span className="text-[9px]" style={{ color: '#8888aa' }}>{c.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Time control */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
              Time control
            </p>
            <div className="grid grid-cols-3 gap-2">
              {TIME_OPTIONS.map((t) => (
                <button
                  key={String(t.value)}
                  onClick={() => setTimeControl(t.value)}
                  className="py-2 text-xs font-semibold transition-all"
                  style={{
                    background: timeControl === t.value ? 'rgba(153,69,255,0.12)' : '#0a0a0f',
                    border: `1.5px solid ${timeControl === t.value ? '#9945FF' : '#2a2a3a'}`,
                    color: timeControl === t.value ? '#9945FF' : '#ffffff',
                  }}
                  aria-pressed={timeControl === t.value}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Wager — on-chain escrow */}
          {!isHost && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
                Your Wager
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {WAGER_CHIPS.map(c => (
                  <button
                    key={c}
                    onClick={() => { setWager(c); setCustomWager(''); setError(null) }}
                    className="py-2 text-xs font-bold transition-all"
                    style={{
                      background: wager === c && !customWager ? `${accentColor}18` : '#0a0a0f',
                      border: `1.5px solid ${wager === c && !customWager ? accentColor : '#2a2a3a'}`,
                      color: wager === c && !customWager ? accentColor : '#ffffff',
                    }}
                  >
                    {c} SOL
                  </button>
                ))}
              </div>
              {/* Custom amount */}
              <div
                className="flex items-center overflow-hidden"
                style={{ border: `1.5px solid ${customWager ? accentColor : '#2a2a3a'}`, background: '#0a0a0f' }}
              >
                <span className="pl-3 text-[10px] font-semibold" style={{ color: '#8888aa' }}>SOL</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={customWager}
                  onChange={e => { setCustomWager(e.target.value); setWager(null); setError(null) }}
                  placeholder="Custom amount"
                  className="flex-1 px-3 py-2.5 text-sm font-mono font-bold bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ color: '#FFD700' }}
                />
              </div>
              <p className="text-[10px]" style={{ color: '#555577' }}>
                Each player sets their own amount. Winner takes the full pot minus 3% fee.
              </p>
            </div>
          )}

          {error && <p className="text-xs" style={{ color: '#FF3B30' }}>{error}</p>}

          <div className="relative mt-1">
            <div className="absolute w-full h-full" style={{ top: 4, left: 4, background: accentColor }} />
            <button
              onClick={handleCreate}
              disabled={loading || !isAuth || (!isHost && resolvedWager() === 0)}
              className="relative w-full py-3 font-bold text-sm uppercase tracking-widest transition-transform duration-75 active:translate-x-1 active:translate-y-1 disabled:opacity-60"
              style={{ background: '#13131a', border: `1.5px solid ${accentColor}`, color: accentColor }}
            >
              {!isAuth ? 'Connect wallet to play' : loading ? 'Creating...' : (isHost ? 'Host Event' : 'Create Game')}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Code display */}
          <div
            className="flex flex-col items-center gap-3 py-5"
            style={{ background: '#0a0a0f', border: '1.5px solid #2a2a3a' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
              {isHost ? 'Player Code' : 'Opponent Code'}
            </p>
            <span
              className="text-3xl font-mono font-bold tracking-widest"
              style={{ color: accentColor, letterSpacing: '0.15em' }}
            >
              {gameCode}
            </span>
            {isHost && (
              <p className="text-[10px] text-center px-4" style={{ color: '#8888aa' }}>
                Share with both players — first to join = white, second = black
              </p>
            )}
            <button
              onClick={copyCode}
              className="px-4 py-1.5 text-xs font-semibold transition-all hover:opacity-80"
              style={{
                background: codeCopied ? `${accentColor}18` : 'transparent',
                border: `1px solid ${codeCopied ? accentColor : '#2a2a3a'}`,
                color: codeCopied ? accentColor : '#8888aa',
              }}
            >
              {codeCopied ? '✓ Copied!' : 'Copy Code'}
            </button>
          </div>

          {/* Spectator link */}
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ background: '#0a0a0f', border: '1px solid #2a2a3a' }}
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#555577' }}>
                Spectator link
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: '#8888aa' }}>Share with viewers</p>
            </div>
            <button
              onClick={copyLink}
              className="px-3 py-1.5 text-xs font-semibold transition-all flex-shrink-0"
              style={{
                background: linkCopied ? 'rgba(20,241,149,0.12)' : 'transparent',
                border: `1px solid ${linkCopied ? '#14F195' : '#2a2a3a'}`,
                color: linkCopied ? '#14F195' : '#8888aa',
              }}
            >
              {linkCopied ? '✓ Copied!' : '🔗 Copy Link'}
            </button>
          </div>

          {!isHost && (
            <p className="text-xs text-center" style={{ color: '#444466' }}>
              Only the first to join by code becomes your opponent. Everyone else spectates.
            </p>
          )}

          <div className="relative">
            <div className="absolute w-full h-full" style={{ top: 4, left: 4, background: accentColor }} />
            <button
              onClick={handleEnter}
              className="relative w-full py-3 font-bold text-sm uppercase tracking-widest transition-transform duration-75 active:translate-x-1 active:translate-y-1"
              style={{ background: '#13131a', border: `1.5px solid ${accentColor}`, color: accentColor }}
            >
              {isHost ? 'Watch Game' : 'Enter Game'}
            </button>
          </div>
        </>
      )}

    </Modal>
  )
}