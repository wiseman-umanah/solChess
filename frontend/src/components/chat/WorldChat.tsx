import { useRef, useEffect, useState } from 'react'
import ChatMessage from './ChatMessage'
import type { Message } from '../../types'

const MOCK_MESSAGES: Message[] = [
  { id: '1', sender: 'GrandmasterX', senderWallet: 'GmX1...9kPq', content: 'gg wp that endgame was clean', timestamp: Date.now() - 300000 },
  { id: '2', sender: 'SolKnight', senderWallet: 'SoK2...3mRt', content: 'anyone want a 5min game? staking 0.5 SOL', timestamp: Date.now() - 240000 },
  { id: '3', sender: 'ChainPawn', senderWallet: 'ChP3...7nVx', content: 'sick move on f7 👀', timestamp: Date.now() - 180000 },
  { id: '4', sender: 'BlockRook', senderWallet: 'BlR4...2kWy', content: 'prize pool on game #4421 is insane rn', timestamp: Date.now() - 120000 },
  { id: '5', sender: 'ZeroLatency', senderWallet: 'ZeL5...8pQz', content: 'finally got my trust score to 90!', timestamp: Date.now() - 60000 },
  { id: '6', sender: 'SolKnight', senderWallet: 'SoK2...3mRt', content: 'congrats! took me weeks', timestamp: Date.now() - 30000 },
]

interface WorldChatProps {
  onClickUser?: (wallet: string) => void
}

export default function WorldChat({ onClickUser }: WorldChatProps) {
  const [messages, setMessages] = useState<Message[]>(MOCK_MESSAGES)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const text = input.trim()
    if (!text) return
    const msg: Message = {
      id: Date.now().toString(),
      sender: 'You',
      senderWallet: 'You...0000',
      content: text,
      timestamp: Date.now(),
    }
    setMessages((prev) => [...prev, msg])
    setInput('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSend()
  }

  return (
    <div className="flex flex-col h-full">
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-2" style={{ color: '#8888aa' }}>
        World Chat
      </p>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} onClickUser={onClickUser} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-1.5 mt-2 px-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Say something..."
          maxLength={200}
          aria-label="Chat message"
          className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 transition-all"
          style={{
            background: '#0a0a0f',
            border: '1px solid #2a2a3a',
            color: '#ffffff',
          }}
        />
        <button
          onClick={handleSend}
          aria-label="Send message"
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
          style={{ background: '#9945FF', color: '#ffffff' }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}
