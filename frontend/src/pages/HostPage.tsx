import { useState } from 'react'
import DoubleCard from '../components/ui/DoubleCard'
import DoubleButton from '../components/ui/DoubleButton'

export default function HostPage() {
  const [form, setForm] = useState({
    eventName: '',
    seedPrize: '',
    timeControl: 5,
    maxSpectators: 100,
  })
  const [eventLink, setEventLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const TIME_OPTIONS = [1, 3, 5, 10, 30]

  function update(key: keyof typeof form, value: string | number) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleGenerate() {
    const id = Math.random().toString(36).slice(2, 10).toUpperCase()
    setEventLink(`${window.location.origin}/game/${id}`)
  }

  function copyLink() {
    if (eventLink) {
      navigator.clipboard.writeText(eventLink).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => {})
    }
  }

  return (
    <div className="flex items-center justify-center min-h-full py-8 px-4">
      <div className="w-full max-w-md">
        <DoubleCard offsetColor="purple">
          <div className="p-6 flex flex-col gap-5">
            <div>
              <h1 className="text-xl font-bold text-white mb-1">Host Event</h1>
              <p className="text-sm" style={{ color: '#8888aa' }}>
                Create a community chess event with a pooled prize.
              </p>
            </div>

            <Field label="Event Name">
              <input
                value={form.eventName}
                onChange={(e) => update('eventName', e.target.value)}
                placeholder="Solana Chess Open #1"
                aria-label="Event name"
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
                style={{ background: '#0a0a0f', border: '1.5px solid #2a2a3a', color: '#ffffff' }}
              />
            </Field>

            <Field label="Seed Prize Pool (SOL)">
              <input
                value={form.seedPrize}
                onChange={(e) => update('seedPrize', e.target.value)}
                placeholder="10.0000"
                type="number"
                min="0"
                step="0.0001"
                aria-label="Seed prize pool"
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
                style={{ background: '#0a0a0f', border: '1.5px solid #2a2a3a', color: '#ffffff' }}
              />
            </Field>

            <Field label="Time Control">
              <div className="flex gap-2">
                {TIME_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => update('timeControl', t)}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: form.timeControl === t ? '#9945FF' : '#0a0a0f',
                      border: `1.5px solid ${form.timeControl === t ? '#9945FF' : '#2a2a3a'}`,
                      color: form.timeControl === t ? '#fff' : '#8888aa',
                    }}
                    aria-pressed={form.timeControl === t}
                  >
                    {t}m
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Max Spectators">
              <input
                value={form.maxSpectators}
                onChange={(e) => update('maxSpectators', parseInt(e.target.value) || 0)}
                type="number"
                min="1"
                aria-label="Maximum spectators"
                className="w-full rounded-lg px-4 py-2.5 text-sm outline-none"
                style={{ background: '#0a0a0f', border: '1.5px solid #2a2a3a', color: '#ffffff' }}
              />
            </Field>

            {!eventLink ? (
              <DoubleButton offsetColor="purple" size="lg" icon="⬡" onClick={handleGenerate} className="w-full">
                Generate Event Link
              </DoubleButton>
            ) : (
              <div className="flex flex-col gap-3">
                <div
                  className="flex items-center justify-between gap-2 px-3 py-3 rounded-xl"
                  style={{ background: '#0a0a0f', border: '1.5px solid #14F195' }}
                >
                  <span className="text-xs truncate" style={{ color: '#14F195' }}>{eventLink}</span>
                  <button
                    onClick={copyLink}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium flex-shrink-0 transition-all"
                    style={{ background: copied ? '#14F195' : '#2a2a3a', color: copied ? '#0a0a0f' : '#fff' }}
                    aria-label="Copy event link"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </DoubleCard>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#8888aa' }}>{label}</p>
      {children}
    </div>
  )
}
