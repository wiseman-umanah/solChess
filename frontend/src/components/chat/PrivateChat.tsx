import { useState, useRef, useEffect } from 'react'
import Avatar from '../ui/Avatar'
import type { Message } from '../../types'

interface PrivateChatProps {
  targetWallet?: string
  targetUsername?: string
}

const MOCK_PRIVATE: Message[] = [
  { id: '1', sender: 'SolKnight', senderWallet: 'SoK2...3mRt', content: 'gg last game! rematch?', timestamp: Date.now() - 120000 },
  { id: '2', sender: 'You', senderWallet: 'You...0000', content: 'sure, 3min this time?', timestamp: Date.now() - 90000 },
  { id: '3', sender: 'SolKnight', senderWallet: 'SoK2...3mRt', content: 'deal. staking 0.25 SOL each', timestamp: Date.now() - 60000 },
]

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function PrivateChat({ targetWallet, targetUsername }: PrivateChatProps) {
  const [messages, setMessages] = useState<Message[]>(targetWallet ? MOCK_PRIVATE : [])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const text = input.trim()
    if (!text || !targetWallet) return
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), sender: 'You', senderWallet: 'You...0000', content: text, timestamp: Date.now() },
    ])
    setInput('')
  }

  if (!targetWallet) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 py-6" style={{ color: '#8888aa' }}>
        <span className="text-2xl">💬</span>
        <p className="text-xs text-center leading-relaxed">
          Click a player's name<br />to start a private chat
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 mb-2" style={{ borderBottom: '1px solid #2a2a3a' }}>
        <Avatar username={targetUsername ?? targetWallet} size="sm" />
        <div>
          <p className="text-xs font-semibold text-white">{targetUsername}</p>
          <p className="text-[10px]" style={{ color: '#8888aa' }}>{targetWallet}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
        {messages.map((msg) => {
          const isOwn = msg.senderWallet === 'You...0000'
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className="max-w-[80%] rounded-xl px-3 py-1.5"
                style={{
                  background: isOwn ? '#9945FF' : '#2a2a3a',
                  color: '#ffffff',
                }}
              >
                <p className="text-xs leading-relaxed">{msg.content}</p>
                <p className="text-[9px] mt-0.5 opacity-60 text-right">{formatTime(msg.timestamp)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-1.5 mt-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Message..."
          maxLength={200}
          aria-label="Private message"
          className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none"
          style={{ background: '#0a0a0f', border: '1px solid #2a2a3a', color: '#ffffff' }}
        />
        <button
          onClick={handleSend}
          aria-label="Send"
          className="px-3 rounded-lg text-xs font-semibold"
          style={{ background: '#9945FF', color: '#ffffff' }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}
