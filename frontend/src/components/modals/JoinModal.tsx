import { useState } from 'react'
import Modal from '../ui/Modal'

interface JoinModalProps {
  open: boolean
  onClose: () => void
}

export default function JoinModal({ open, onClose }: JoinModalProps) {
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  function handleJoin() {
    const clean = code.trim().toUpperCase()
    if (!clean) { setError('Enter a game code'); return }
    if (!clean.startsWith('CHESS-') || clean.length !== 12) {
      setError('Invalid code — should look like CHESS-ABC123')
      return
    }
    setError('')
    setJoining(true)
    setTimeout(() => { setJoining(false); onClose() }, 1200)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12)
    setCode(val)
    setError('')
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-center gap-3 pr-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: 'rgba(20,241,149,0.1)', border: '1px solid rgba(20,241,149,0.3)' }}
        >
          →
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Join Game</h2>
          <p className="text-xs" style={{ color: '#8888aa' }}>Enter the code shared by your opponent</p>
        </div>
      </div>

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
          className="w-full px-4 py-3 font-mono text-base font-bold tracking-widest text-white outline-none transition-all"
          style={{
            background: '#0a0a0f',
            border: `1.5px solid ${error ? '#FF3B30' : code ? '#14F195' : '#2a2a3a'}`,
            letterSpacing: '0.15em',
          }}
        />
        {error && <p className="text-xs" style={{ color: '#FF3B30' }}>{error}</p>}
      </div>

      <div className="relative mt-1">
        <div
          className="absolute w-full h-full"
          style={{ top: 4, left: 4, background: '#14F195' }}
        />
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
