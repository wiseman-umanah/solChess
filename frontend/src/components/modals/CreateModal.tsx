import { useState } from 'react'
import Modal from '../ui/Modal'

type Mode = 'create' | 'host' | 'friend'
type Stage = 'config' | 'creating' | 'ready'

interface CreateModalProps {
  open: boolean
  mode: Mode
  onClose: () => void
}

const MODE_LABELS: Record<Mode, { title: string; icon: string; color: string }> = {
  create: { title: 'Create Game',   icon: '♟', color: '#9945FF' },
  host:   { title: 'Host Event',    icon: '⬡', color: '#9945FF' },
  friend: { title: 'Play a Friend', icon: '♥', color: '#14F195' },
}

const TIME_OPTIONS = [5, 10, 15, 25, 30]
const QUICK_CHIPS = [0.01, 0.05, 0.1, 0.5, 1, 5]

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return 'CHESS-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function CreateModal({ open, mode, onClose }: CreateModalProps) {
  const [timeBased, setTimeBased] = useState(false)
  const [selectedTime, setSelectedTime] = useState(10)
  const [wager, setWager] = useState<number>(0.01)
  const [customInput, setCustomInput] = useState('')
  const [stage, setStage] = useState<Stage>('config')
  const [gameCode, setGameCode] = useState('')
  const [copied, setCopied] = useState(false)

  const meta = MODE_LABELS[mode]
  const showWager = mode === 'create' || mode === 'host'

  function handleCustomWager(val: string) {
    setCustomInput(val)
    const n = parseFloat(val)
    if (!isNaN(n) && n >= 0.01) setWager(n)
  }

  function handleChip(chip: number) {
    setWager(chip)
    setCustomInput('')
  }

  function handleCreate() {
    setStage('creating')
    // Simulate backend call
    setTimeout(() => {
      setGameCode(randomCode())
      setStage('ready')
    }, 1200)
  }

  function handleStart() {
    onClose()
    // Reset for next open
    setTimeout(() => {
      setStage('config')
      setGameCode('')
      setCopied(false)
    }, 300)
  }

  function handleCopy() {
    navigator.clipboard.writeText(gameCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal open={open} onClose={onClose}>

      {/* Header */}
      <div className="flex items-center gap-3 pr-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: `${meta.color}22`, border: `1px solid ${meta.color}44` }}
        >
          {meta.icon}
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">{meta.title}</h2>
          <p className="text-xs" style={{ color: '#8888aa' }}>Configure your game settings</p>
        </div>
      </div>

      {/* Config fields — hidden once code is ready */}
      {stage === 'config' && (
        <>
          {/* Time-based toggle */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: '#0a0a0f', border: '1px solid #2a2a3a' }}
          >
            <div>
              <p className="text-sm font-medium text-white">Time-based game</p>
              <p className="text-[11px] mt-0.5" style={{ color: '#8888aa' }}>
                Each player has a fixed clock per game
              </p>
            </div>
            <button
              onClick={() => setTimeBased(v => !v)}
              className="relative w-11 h-6 rounded-full transition-all duration-200 flex-shrink-0"
              style={{ background: timeBased ? '#9945FF' : '#2a2a3a' }}
              aria-pressed={timeBased}
              aria-label="Toggle time-based game"
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full transition-all duration-200"
                style={{ background: '#ffffff', left: timeBased ? '22px' : '2px', boxShadow: '0 1px 4px rgba(0,0,0,0.4)' }}
              />
            </button>
          </div>

          {timeBased && (
            <div className="flex gap-2 flex-wrap">
              {TIME_OPTIONS.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTime(t)}
                  className="flex-1 min-w-[52px] py-2 text-sm font-semibold transition-all duration-150"
                  style={{
                    background: selectedTime === t ? '#9945FF' : '#0a0a0f',
                    border: `1.5px solid ${selectedTime === t ? '#9945FF' : '#2a2a3a'}`,
                    color: selectedTime === t ? '#ffffff' : '#8888aa',
                    boxShadow: selectedTime === t ? '0 0 12px rgba(153,69,255,0.35)' : 'none',
                  }}
                >
                  {t}m
                </button>
              ))}
            </div>
          )}

          {/* Wager */}
          {showWager && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>Wager</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold tabular-nums" style={{ color: '#FFD700' }}>
                    {wager.toFixed(wager % 1 === 0 ? 2 : Math.min(4, (wager.toString().split('.')[1] ?? '').length))}
                  </span>
                  <span className="text-xs" style={{ color: '#8888aa' }}>SOL</span>
                </div>
              </div>

              {/* Quick chips */}
              <div className="flex gap-1.5">
                {QUICK_CHIPS.map(chip => {
                  const active = !customInput && wager === chip
                  return (
                    <button
                      key={chip}
                      onClick={() => handleChip(chip)}
                      className="flex-1 py-2 text-xs font-bold transition-all duration-150"
                      style={{
                        background: active ? 'rgba(20,241,149,0.1)' : '#0a0a0f',
                        border: `1.5px solid ${active ? '#14F195' : '#2a2a3a'}`,
                        color: active ? '#14F195' : '#8888aa',
                        boxShadow: active ? '0 0 10px rgba(20,241,149,0.2)' : 'none',
                      }}
                    >
                      {chip}
                    </button>
                  )
                })}
              </div>

              {/* Custom amount — stepper + freeform */}
              <div
                className="flex items-center gap-0 overflow-hidden"
                style={{ border: '1.5px solid #2a2a3a', background: '#0a0a0f' }}
              >
                <button
                  onClick={() => {
                    const next = Math.max(0.01, parseFloat((wager - 0.01).toFixed(4)))
                    setWager(next)
                    setCustomInput(next.toString())
                  }}
                  className="px-4 py-3 text-lg font-bold hover:opacity-70 transition-opacity flex-shrink-0"
                  style={{ color: '#8888aa', borderRight: '1px solid #2a2a3a' }}
                  aria-label="Decrease wager"
                >
                  −
                </button>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={customInput || wager}
                  onChange={e => handleCustomWager(e.target.value)}
                  className="flex-1 text-center font-mono font-bold text-base outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  style={{ color: '#FFD700' }}
                  aria-label="Custom wager amount"
                />
                <span className="text-xs pr-3 flex-shrink-0" style={{ color: '#8888aa' }}>SOL</span>
                <button
                  onClick={() => {
                    const next = parseFloat((wager + 0.01).toFixed(4))
                    setWager(next)
                    setCustomInput(next.toString())
                  }}
                  className="px-4 py-3 text-lg font-bold hover:opacity-70 transition-opacity flex-shrink-0"
                  style={{ color: '#14F195', borderLeft: '1px solid #2a2a3a' }}
                  aria-label="Increase wager"
                >
                  +
                </button>
              </div>

              <p className="text-[10px] text-center" style={{ color: '#55556a' }}>
                Min 0.01 SOL · Held in escrow · Released on-chain to winner
              </p>
            </div>
          )}
        </>
      )}

      {/* Game code — shown after backend responds */}
      {stage === 'ready' && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>
            Game Code
          </p>
          <div
            className="flex items-center justify-between px-4 py-4 "
            style={{ background: '#0a0a0f', border: `1.5px solid ${meta.color}55` }}
          >
            <span
              className="font-mono text-xl font-bold tracking-widest"
              style={{ color: meta.color, textShadow: `0 0 20px ${meta.color}55` }}
            >
              {gameCode}
            </span>
            <button
              onClick={handleCopy}
              className="text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: copied ? 'rgba(20,241,149,0.15)' : '#2a2a3a',
                color: copied ? '#14F195' : '#8888aa',
                border: copied ? '1px solid #14F19555' : '1px solid transparent',
              }}
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
          <p className="text-[11px] text-center" style={{ color: '#8888aa' }}>
            Share this code with your opponent — they join, you start
          </p>
        </div>
      )}

      {/* CTA button */}
      <div className="relative mt-1">
        <div
          className="absolute w-full h-full"
          style={{ top: 4, left: 4, background: meta.color }}
        />
        <button
          onClick={stage === 'ready' ? handleStart : handleCreate}
          disabled={stage === 'creating'}
          className="relative w-full py-3 font-bold text-sm uppercase tracking-widest transition-transform duration-75 active:translate-x-1 active:translate-y-1 disabled:opacity-60"
          style={{ background: '#13131a', border: `1.5px solid ${meta.color}`, color: meta.color }}
        >
          {stage === 'config'   && 'Create Game'}
          {stage === 'creating' && (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: meta.color, borderTopColor: 'transparent' }} />
              Creating...
            </span>
          )}
          {stage === 'ready' && 'Start Game'}
        </button>
      </div>

    </Modal>
  )
}
