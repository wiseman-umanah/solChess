import Avatar from '../ui/Avatar'
import type { Message } from '../../types'

interface ChatMessageProps {
  message: Message
  isOwn?: boolean
  onClickUser?: (wallet: string) => void
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const gradientColors = ['#9945FF', '#14F195', '#FF6B6B', '#4ECDC4', '#FFD700']
function getUserColor(wallet: string): string {
  return gradientColors[wallet.charCodeAt(0) % gradientColors.length]
}

export default function ChatMessage({ message, isOwn = false, onClickUser }: ChatMessageProps) {
  const color = isOwn ? '#14F195' : getUserColor(message.senderWallet)

  return (
    <div className="flex gap-2 px-2 py-1.5 hover:bg-white/[0.02] rounded group animate-slide-in">
      <div className="flex-shrink-0 mt-0.5">
        <Avatar username={message.sender} size="sm" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <button
            className="text-[11px] font-semibold leading-none hover:opacity-80 transition-opacity"
            style={{ color }}
            onClick={() => !isOwn && onClickUser?.(message.senderWallet)}
            aria-label={`View ${message.sender}'s profile`}
          >
            {isOwn ? 'You' : message.sender}
          </button>
          <span
            className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: '#8888aa' }}
          >
            {formatTime(message.timestamp)}
          </span>
        </div>
        <p className="text-xs mt-0.5 break-words leading-relaxed" style={{ color: '#d0d0e8' }}>
          {message.content}
        </p>
      </div>
    </div>
  )
}