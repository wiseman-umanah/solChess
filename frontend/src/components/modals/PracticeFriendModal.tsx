import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '../ui/Modal'
import { api } from '../../lib/apiClient'

interface PracticeFriendModalProps {
  open: boolean
  onClose: () => void
}

const TIME_OPTIONS = [
  { label: 'No timer', value: null },
  { label: '3 min',   value: 180 },
  { label: '5 min',   value: 300 },
  { label: '10 min',  value: 600 },
  { label: '15 min',  value: 900 },
]

const COLORS = [
  { value: 'white' as const, label: '♔ White', desc: 'Move first' },
  { value: 'black' as const, label: '♚ Black', desc: 'Move second' },
]

type Step = 'setup' | 'created'

export default function PracticeFriendModal({ open, onClose }: PracticeFriendModalProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('setup')
  const [timeControl, setTimeControl] = useState<number | null>(300)
  const [color, setColor] = useState<'white' | 'black'>('white')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gameCode, setGameCode] = useState('')
  const [gameId, setGameId] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleCreate() {
    setLoading(true)
    setError(null)
    try {
      const res = await api.post<{ gameId: string; code: string }>('/api/v1/games', {
        timeControl: timeControl,
        isPractice: true,
        creatorColor: color,
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

  function handleCopy() {
    navigator.clipboard.writeText(gameCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleStart() {
    onClose()
    navigate(`/games/${gameId}`)
  }

  function handleClose() {
    // Reset state when closing
    setStep('setup')
    setError(null)
    setCopied(false)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose}>
      {/* Header */}
      <div className="flex items-center gap-3 pr-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: 'rgba(20,241,149,0.1)', border: '1px solid rgba(20,241,149,0.3)' }}
        >
          ♟
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">
            {step === 'setup' ? 'Play with Friend' : 'Game Created!'}
          </h2>
          <p className="text-xs" style={{ color: '#8888aa' }}>
            {step === 'setup' ? 'Private game — invite a friend' : 'Share the code with your friend'}
          </p>
        </div>
      </div>

      {step === 'setup' ? (
        <>
          {/* Color */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
              Play as
            </p>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className="flex-1 flex flex-col items-center py-3 transition-all duration-150"
                  style={{
                    background: color === c.value ? 'rgba(20,241,149,0.1)' : '#0a0a0f',
                    border: `1.5px solid ${color === c.value ? '#14F195' : '#2a2a3a'}`,
                    boxShadow: color === c.value ? '0 0 12px rgba(20,241,149,0.2)' : 'none',
                  }}
                  aria-pressed={color === c.value}
                >
                  <span className="text-base mb-0.5">{c.label}</span>
                  <span className="text-[9px]" style={{ color: '#8888aa' }}>{c.desc}</span>
                </button>
              ))}
            </div>
          </div>

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
            {timeControl === null && (
              <p className="text-[10px]" style={{ color: '#8888aa' }}>
                No timer — play at your own pace. Owner can end the game anytime.
              </p>
            )}
          </div>

          {error && (
            <p className="text-xs" style={{ color: '#FF3B30' }}>{error}</p>
          )}

          {/* CTA */}
          <div className="relative mt-1">
            <div className="absolute w-full h-full" style={{ top: 4, left: 4, background: '#14F195' }} />
            <button
              onClick={handleCreate}
              disabled={loading}
              className="relative w-full py-3 font-bold text-sm uppercase tracking-widest transition-transform duration-75 active:translate-x-1 active:translate-y-1"
              style={{ background: '#13131a', border: '1.5px solid #14F195', color: '#14F195' }}
            >
              {loading ? 'Creating...' : 'Create Game'}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Game code display */}
          <div
            className="flex flex-col items-center gap-3 py-6"
            style={{ background: '#0a0a0f', border: '1.5px solid #2a2a3a' }}
          >
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
              Game Code
            </p>
            <span
              className="text-3xl font-mono font-bold tracking-widest"
              style={{ color: '#14F195', letterSpacing: '0.15em' }}
            >
              {gameCode}
            </span>
            <button
              onClick={handleCopy}
              className="px-4 py-1.5 text-xs font-semibold transition-all hover:opacity-80"
              style={{
                background: copied ? 'rgba(20,241,149,0.15)' : 'transparent',
                border: `1px solid ${copied ? '#14F195' : '#2a2a3a'}`,
                color: copied ? '#14F195' : '#8888aa',
              }}
            >
              {copied ? '✓ Copied!' : 'Copy Code'}
            </button>
          </div>

          <p className="text-xs text-center" style={{ color: '#8888aa' }}>
            Share this code with your friend. The timer starts once both players are in the game.
          </p>

          {/* CTA */}
          <div className="relative">
            <div className="absolute w-full h-full" style={{ top: 4, left: 4, background: '#9945FF' }} />
            <button
              onClick={handleStart}
              className="relative w-full py-3 font-bold text-sm uppercase tracking-widest transition-transform duration-75 active:translate-x-1 active:translate-y-1"
              style={{ background: '#13131a', border: '1.5px solid #9945FF', color: '#9945FF' }}
            >
              Enter Game
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}