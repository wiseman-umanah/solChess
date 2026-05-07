import { useRef, useEffect, useState } from 'react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import ChatMessage from './ChatMessage'
import { api } from '../../lib/apiClient'
import { socket } from '../../lib/socket'
import { useUserStore } from '../../stores/userStore'
import { useAuthStore } from '../../stores/authStore'
import type { Message } from '../../types'

interface BackendMessage {
  id: string
  senderWallet: string
  content: string
  timestamp: string
  sender: { username: string | null }
}

function adapt(m: BackendMessage): Message {
  return {
    id: m.id,
    sender: m.sender?.username ?? `${m.senderWallet.slice(0, 4)}...${m.senderWallet.slice(-4)}`,
    senderWallet: m.senderWallet,
    content: m.content,
    timestamp: new Date(m.timestamp).getTime(),
  }
}

interface WorldChatProps {
  onClickUser?: (wallet: string, username: string) => void
}

export default function WorldChat({ onClickUser }: WorldChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const { wallet } = useUserStore()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())
  const { setVisible } = useWalletModal()

  // Load history on mount
  useEffect(() => {
    api.get<BackendMessage[]>('/api/v1/chat/world?limit=100')
      .then((data) => setMessages(data.map(adapt).reverse()))
      .catch(() => {}) // not fatal — messages will still arrive via socket
  }, [])

  // Subscribe to incoming world messages
  useEffect(() => {
    function onMessage(m: BackendMessage) {
      setMessages((prev) => [...prev, adapt(m)])
    }
    socket.on('world-message', onMessage)
    return () => { socket.off('world-message', onMessage) }
  }, [])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const text = input.trim()
    if (!text) return
    if (!isAuthenticated) {
      setVisible(true)
      return
    }
    socket.emit('world-chat', { content: text })
    setInput('')
  }

  return (
    <div className="flex flex-col h-full">
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2 px-2" style={{ color: '#8888aa' }}>
        World Chat
      </p>

      <div className="flex-1 overflow-y-auto min-h-0">
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            isOwn={msg.senderWallet === wallet}
            onClickUser={onClickUser ? (w) => onClickUser(w, msg.sender) : undefined}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-1.5 mt-2 px-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={isAuthenticated ? 'Say something...' : 'Type to chat…'}
          maxLength={500}
          aria-label="Chat message"
          className="flex-1 rounded-lg px-3 py-1.5 text-xs outline-none focus:ring-1 transition-all disabled:opacity-40"
          style={{ background: '#0a0a0f', border: '1px solid #2a2a3a', color: '#ffffff' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          aria-label="Send message"
          className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-40"
          style={{ background: '#9945FF', color: '#ffffff' }}
        >
          ↑
        </button>
      </div>
    </div>
  )
}