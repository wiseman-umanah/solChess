import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DoubleCard from '../components/ui/DoubleCard'
import DoubleButton from '../components/ui/DoubleButton'

interface GamePreview {
  code: string
  white: string
  timeControl: string
  wager: number
}

function mockFetchGame(code: string): GamePreview {
  return {
    code,
    white: 'GrandmasterX',
    timeControl: '5 min',
    wager: 0.5,
  }
}

export default function JoinPage() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [preview, setPreview] = useState<GamePreview | null>(null)
  const [error, setError] = useState('')

  function handleLookup() {
    if (code.trim().length !== 6) {
      setError('Game code must be exactly 6 characters')
      return
    }
    setError('')
    setPreview(mockFetchGame(code.trim().toUpperCase()))
  }

  function handleJoin() {
    if (preview) navigate(`/game/${preview.code}`)
  }

  return (
    <div className="flex items-center justify-center min-h-full py-8 px-4">
      <div className="w-full max-w-md">
        <DoubleCard offsetColor="green">
          <div className="p-6 flex flex-col gap-6">
            <div>
              <h1 className="text-xl font-bold text-white mb-1">Join Game</h1>
              <p className="text-sm" style={{ color: '#8888aa' }}>
                Enter a 6-character game code to join or spectate.
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#8888aa' }}>
                Game Code
              </p>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                  placeholder="ABC123"
                  maxLength={6}
                  aria-label="Game code"
                  className="flex-1 rounded-lg px-4 py-2.5 text-base font-mono text-center tracking-[0.3em] outline-none uppercase"
                  style={{ background: '#0a0a0f', border: '1.5px solid #2a2a3a', color: '#ffffff' }}
                />
                <button
                  onClick={handleLookup}
                  className="px-4 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: '#14F195', color: '#0a0a0f' }}
                  aria-label="Look up game"
                >
                  Find
                </button>
              </div>
              {error && <p className="text-xs mt-2" style={{ color: '#FF3B30' }}>{error}</p>}
            </div>

            {preview && (
              <div
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{ background: '#0a0a0f', border: '1.5px solid #2a2a3a' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#8888aa' }}>Host</span>
                  <span className="text-sm font-semibold text-white">{preview.white}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#8888aa' }}>Time Control</span>
                  <span className="text-sm font-semibold text-white">{preview.timeControl}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: '#8888aa' }}>Wager</span>
                  <span className="text-sm font-bold" style={{ color: '#FFD700' }}>
                    {preview.wager.toFixed(4)} SOL
                  </span>
                </div>
              </div>
            )}

            {preview && (
              <DoubleButton offsetColor="green" size="lg" icon="→" onClick={handleJoin} className="w-full">
                Join & Stake
              </DoubleButton>
            )}
          </div>
        </DoubleCard>
      </div>
    </div>
  )
}
