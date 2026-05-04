import { useState } from 'react'
import Modal from '../ui/Modal'

interface PracticeAIModalProps {
  open: boolean
  onClose: () => void
}

const DIFFICULTIES = [
  { label: 'Beginner', desc: 'Just learning', color: '#14F195' },
  { label: 'Intermediate', desc: 'Know the basics', color: '#FFD700' },
  { label: 'Advanced', desc: 'Competitive play', color: '#FF8C42' },
  { label: 'Master', desc: 'Brutal difficulty', color: '#FF3B30' },
]

export default function PracticeAIModal({ open, onClose }: PracticeAIModalProps) {
  const [difficulty, setDifficulty] = useState('Intermediate')
  const [starting, setStarting] = useState(false)

  function handleStart() {
    setStarting(true)
    setTimeout(() => { setStarting(false); onClose() }, 1200)
  }

  return (
    <Modal open={open} onClose={onClose}>
      <div className="flex items-center gap-3 pr-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: 'rgba(153,69,255,0.12)', border: '1px solid rgba(153,69,255,0.3)' }}
        >
          ⚙
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Practice vs AI</h2>
          <p className="text-xs" style={{ color: '#8888aa' }}>Sharpen your skills, no stakes</p>
        </div>
      </div>

      {/* Difficulty */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#8888aa' }}>Difficulty</p>
        <div className="grid grid-cols-2 gap-2">
          {DIFFICULTIES.map(d => (
            <button
              key={d.label}
              onClick={() => setDifficulty(d.label)}
              className="flex flex-col items-start px-3 py-2.5 transition-all duration-150 text-left"
              style={{
                background: difficulty === d.label ? `${d.color}14` : '#0a0a0f',
                border: `1.5px solid ${difficulty === d.label ? d.color : '#2a2a3a'}`,
                boxShadow: difficulty === d.label ? `0 0 12px ${d.color}30` : 'none',
              }}
              aria-pressed={difficulty === d.label}
            >
              <span className="text-sm font-semibold" style={{ color: difficulty === d.label ? d.color : '#ffffff' }}>
                {d.label}
              </span>
              <span className="text-[10px]" style={{ color: '#8888aa' }}>{d.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-1">
        <div className="absolute w-full h-full" style={{ top: 4, left: 4, background: '#9945FF' }} />
        <button
          onClick={handleStart}
          disabled={starting}
          className="relative w-full py-3 font-bold text-sm uppercase tracking-widest transition-transform duration-75 active:translate-x-1 active:translate-y-1"
          style={{ background: '#13131a', border: '1.5px solid #9945FF', color: '#9945FF' }}
        >
          {starting ? 'Starting...' : 'Start Practice'}
        </button>
      </div>
    </Modal>
  )
}
