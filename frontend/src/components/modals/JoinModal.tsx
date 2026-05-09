import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../ui/Modal'
import { api } from '../../lib/apiClient'
import { useAnchorWallet } from '@solana/wallet-adapter-react'
import { joinEscrow } from '../../lib/anchorProgram'

interface JoinModalProps {
  open: boolean
  onClose: () => void
}

const WAGER_CHIPS = [0.01, 0.05, 0.1, 0.25, 0.5, 1]

export default function JoinModal({ open, onClose }: JoinModalProps) {
  const navigate     = useNavigate()
  const anchorWallet = useAnchorWallet()
  const [code,         setCode]        = useState('')
  const [joining,      setJoining]     = useState(false)
  const [error,        setError]       = useState('')
  const [wager,        setWager]       = useState<number | null>(null)
  const [customWager,  setCustomWager] = useState('')
  // creatorWager is set once we know the game has a wager (after first code lookup)
  const [creatorWager, setCreatorWager] = useState<number | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12)
    setCode(val)
    setError('')
    setCreatorWager(null)
    setWager(null)
    setCustomWager('')
  }

  function resolvedWager(): number | null {
    if (customWager) {
      const v = parseFloat(customWager)
      return isNaN(v) ? null : v
    }
    return wager
  }

  async function handleJoin() {
    const clean = code.trim().toUpperCase()
    if (!clean) { setError('Enter a game code'); return }
    if (!clean.startsWith('CHESS-') || clean.length !== 12) {
      setError('Invalid code — should look like CHESS-ABC123')
      return
    }

    const joinerWager = resolvedWager()

    setError('')
    setJoining(true)
    try {
      const game = await api.post<{ id: string; wager: number }>('/api/v1/games/by-code/join', { code: clean })

      if (game.wager > 0) {
        if (!anchorWallet) {
          setError('Connect a Solana wallet to join a wager game')
          setJoining(false)
          return
        }
        if (!joinerWager || joinerWager < 0.01) {
          setCreatorWager(game.wager)
          setError('Set your wager to join this game')
          setJoining(false)
          return
        }
        try {
          await joinEscrow(anchorWallet, game.id, joinerWager)
        } catch (e: unknown) {
          setError(`Joined but escrow failed: ${e instanceof Error ? e.message : 'tx error'}`)
          setJoining(false)
          return
        }
      }

      onClose()
      navigate(`/games/${game.id}`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to join game')
      setJoining(false)
    }
  }

  function handleClose() {
    setCode('')
    setError('')
    setWager(null)
    setCustomWager('')
    setCreatorWager(null)
    onClose()
  }

  const joinerWagerValue = resolvedWager()

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="flex items-center gap-3 pr-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: 'rgba(20,241,149,0.1)', border: '1px solid rgba(20,241,149,0.3)' }}
        >
          →
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Join Game</h2>
          <p className="text-xs" style={{ color: '#8888aa' }}>Works for public and private practice games</p>
        </div>
      </div>

      {/* Code input */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
          Game Code
        </p>
        <input
          value={code}
          onChange={handleChange}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          placeholder="CHESS-XXXXXX"
          maxLength={12}
          aria-label="Game code"
          autoFocus
          className="w-full px-4 py-3 font-mono text-base font-bold tracking-widest text-white outline-none transition-all"
          style={{
            background: '#0a0a0f',
            border: `1.5px solid ${error && !creatorWager ? '#FF3B30' : code ? '#14F195' : '#2a2a3a'}`,
            letterSpacing: '0.15em',
          }}
        />
      </div>

      {/* Wager picker — shown when game has a wager */}
      {creatorWager !== null && creatorWager > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
              Your Wager
            </p>
            <p className="text-[10px]" style={{ color: '#555577' }}>
              Creator wagered <span style={{ color: '#FFD700' }}>{creatorWager} SOL</span>
            </p>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {WAGER_CHIPS.map(c => (
              <button
                key={c}
                onClick={() => { setWager(c); setCustomWager('') }}
                className="py-2 text-xs font-bold transition-all"
                style={{
                  background: wager === c && !customWager ? 'rgba(153,69,255,0.15)' : '#0a0a0f',
                  border: `1.5px solid ${wager === c && !customWager ? '#9945FF' : '#2a2a3a'}`,
                  color: wager === c && !customWager ? '#9945FF' : '#ffffff',
                }}
              >
                {c} SOL
              </button>
            ))}
          </div>
          {/* Custom amount */}
          <div
            className="flex items-center overflow-hidden"
            style={{ border: `1.5px solid ${customWager ? '#9945FF' : '#2a2a3a'}`, background: '#0a0a0f' }}
          >
            <span className="pl-3 text-[10px] font-semibold" style={{ color: '#8888aa' }}>SOL</span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={customWager}
              onChange={e => { setCustomWager(e.target.value); setWager(null) }}
              placeholder="Custom amount"
              className="flex-1 px-3 py-2 text-sm font-mono font-bold bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              style={{ color: '#FFD700' }}
            />
          </div>
          {joinerWagerValue !== null && joinerWagerValue >= 0.01 && (
            <p className="text-[10px]" style={{ color: '#14F195' }}>
              Total pot: {((creatorWager ?? 0) + joinerWagerValue).toFixed(4)} SOL · Winner takes all minus 3% fee
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs" style={{ color: '#FF3B30' }}>{error}</p>}

      <div className="relative mt-1">
        <div className="absolute w-full h-full" style={{ top: 4, left: 4, background: '#14F195' }} />
        <button
          onClick={handleJoin}
          disabled={joining}
          className="relative w-full py-3 font-bold text-sm uppercase tracking-widest transition-transform duration-75 active:translate-x-1 active:translate-y-1"
          style={{ background: '#13131a', border: '1.5px solid #14F195', color: '#14F195' }}
        >
          {joining ? 'Joining...' : 'Join Game'}
        </button>
      </div>
    </Modal>
  )
}
