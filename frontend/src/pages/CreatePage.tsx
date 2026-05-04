import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DoubleCard from '../components/ui/DoubleCard'
import DoubleButton from '../components/ui/DoubleButton'

const TIME_CONTROLS = [
  { label: '1 min', seconds: 60 },
  { label: '3 min', seconds: 180 },
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '30 min', seconds: 1800 },
]

export default function CreatePage() {
  const navigate = useNavigate()
  const [timeControl, setTimeControl] = useState(300)
  const [wager, setWager] = useState('')
  const [gameCode, setGameCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function generateCode() {
    const code = Math.random().toString(36).slice(2, 8).toUpperCase()
    setGameCode(code)
  }

  function copyCode() {
    if (gameCode) {
      navigator.clipboard.writeText(gameCode).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => {})
    }
  }

  function startGame() {
    if (gameCode) navigate(`/game/${gameCode}`)
  }

  return (
    <div className="flex items-center justify-center min-h-full py-8 px-4">
      <div className="w-full max-w-md">
        <DoubleCard offsetColor="purple">
          <div className="p-6 flex flex-col gap-6">
            <div>
              <h1 className="text-xl font-bold text-white mb-1">Create Game</h1>
              <p className="text-sm" style={{ color: '#8888aa' }}>
                Set your time control and wager, then share the game code.
              </p>
            </div>

            {/* Time control */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#8888aa' }}>
                Time Control
              </p>
              <div className="flex flex-wrap gap-2">
                {TIME_CONTROLS.map((tc) => (
                  <button
                    key={tc.seconds}
                    onClick={() => setTimeControl(tc.seconds)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: timeControl === tc.seconds ? '#9945FF' : '#0a0a0f',
                      border: `1.5px solid ${timeControl === tc.seconds ? '#9945FF' : '#2a2a3a'}`,
                      color: timeControl === tc.seconds ? '#ffffff' : '#8888aa',
                    }}
                    aria-pressed={timeControl === tc.seconds}
                  >
                    {tc.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Wager */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: '#8888aa' }}>
                Wager Amount (SOL)
              </p>
              <input
                value={wager}
                onChange={(e) => setWager(e.target.value)}
                placeholder="0.0000"
                type="number"
                min="0"
                step="0.0001"
                aria-label="Wager amount in SOL"
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
                style={{ background: '#0a0a0f', border: '1.5px solid #2a2a3a', color: '#ffffff' }}
              />
            </div>

            {/* Generate code */}
            {!gameCode ? (
              <DoubleButton offsetColor="purple" size="lg" icon="♟" onClick={generateCode} className="w-full">
                Generate Game Code
              </DoubleButton>
            ) : (
              <div className="flex flex-col gap-3">
                <div
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{ background: '#0a0a0f', border: '1.5px solid #14F195' }}
                >
                  <span className="text-2xl font-mono font-bold tracking-[0.3em] text-white">
                    {gameCode}
                  </span>
                  <button
                    onClick={copyCode}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                    style={{ background: copied ? '#14F195' : '#2a2a3a', color: copied ? '#0a0a0f' : '#ffffff' }}
                    aria-label="Copy game code"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <DoubleButton offsetColor="green" size="lg" onClick={startGame} className="w-full">
                  Start Game
                </DoubleButton>
              </div>
            )}
          </div>
        </DoubleCard>
      </div>
    </div>
  )
}
