import { useState, useRef, useEffect } from 'react'
import Avatar from '../ui/Avatar'
import { api } from '../../lib/apiClient'
import { socket } from '../../lib/socket'
import { useUserStore } from '../../stores/userStore'

interface BackendMessage {
  id: string
  senderWallet: string
  content: string
  timestamp: string
  sender: { username: string | null }
  fromWallet?: string
}

interface ChatMsg {
  id: string
  content: string
  timestamp: number
  isOwn: boolean
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface PrivateChatProps {
  targetWallet?: string
  targetUsername?: string
}

export default function PrivateChat({ targetWallet, targetUsername }: PrivateChatProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const { wallet } = useUserStore()

  // Load history when target changes
  useEffect(() => {
    if (!targetWallet || !wallet) { setMessages([]); return }

    api.get<BackendMessage[]>(`/api/v1/chat/${wallet}?with=${targetWallet}&limit=50`)
      .then((data) =>
        setMessages(
          data
            .map((m) => ({
              id: m.id,
              content: m.content,
              timestamp: new Date(m.timestamp).getTime(),
              isOwn: m.senderWallet === wallet,
            }))
            .reverse(),
        ),
      )
      .catch(() => setMessages([]))
  }, [targetWallet, wallet])

  // Listen for incoming private messages from this target
  useEffect(() => {
    function onPrivate(m: BackendMessage) {
      const from = m.fromWallet ?? m.senderWallet
      if (from !== targetWallet) return // belongs to a different DM thread
      setMessages((prev) => [
        ...prev,
        { id: m.id, content: m.content, timestamp: new Date(m.timestamp).getTime(), isOwn: false },
      ])
    }
    socket.on('private-message', onPrivate)
    return () => { socket.off('private-message', onPrivate) }
  }, [targetWallet])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const text = input.trim()
    if (!text || !targetWallet) return

    const optimistic: ChatMsg = {
      id: `opt-${Date.now()}`,
      content: text,
      timestamp: Date.now(),
      isOwn: true,
    }
    setMessages((prev) => [...prev, optimistic])
    socket.emit('private-chat', { toWallet: targetWallet, content: text })
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

  const displayName = targetUsername ?? `${targetWallet.slice(0, 4)}...${targetWallet.slice(-4)}`

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 mb-2" style={{ borderBottom: '1px solid #2a2a3a' }}>
        <Avatar username={displayName} size="sm" />
        <div>
          <p className="text-xs font-semibold text-white">{displayName}</p>
          <p className="text-[10px]" style={{ color: '#8888aa' }}>
            {targetWallet.slice(0, 4)}…{targetWallet.slice(-4)}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
        {messages.length === 0 && (
          <p className="text-[10px] text-center py-4" style={{ color: '#55556a' }}>No messages yet</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
            <div
              className="max-w-[80%] rounded-xl px-3 py-1.5"
              style={{ background: msg.isOwn ? '#9945FF' : '#2a2a3a', color: '#ffffff' }}
            >
              <p className="text-xs leading-relaxed">{msg.content}</p>
              <p className="text-[9px] mt-0.5 opacity-60 text-right">{formatTime(msg.timestamp)}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-1.5 mt-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Message..."
          maxLength={500}
          aria-label="Private message"
          className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none"
          style={{ background: '#0a0a0f', border: '1px solid #2a2a3a', color: '#ffffff' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          aria-label="Send"
          className="px-3 rounded-lg text-xs font-semibold disabled:opacity-40"
          style={{ background: '#9945FF', color: '#ffffff' }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}