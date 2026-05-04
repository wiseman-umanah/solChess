interface AvatarProps {
  username: string
  src?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  online?: boolean
  gradientBorder?: boolean
}

const sizes = {
  sm: 'w-7 h-7 text-xs',
  md: 'w-9 h-9 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
}

function getInitials(username: string): string {
  return username.slice(0, 2).toUpperCase()
}

function getColor(username: string): string {
  const colors = ['#9945FF', '#14F195', '#FF6B6B', '#4ECDC4', '#FFD700', '#FF8C42']
  const index = username.charCodeAt(0) % colors.length
  return colors[index]
}

export default function Avatar({ username, src, size = 'md', online = false, gradientBorder = false }: AvatarProps) {
  const sizeClass = sizes[size]
  const bgColor = getColor(username)

  return (
    <div className="relative inline-block flex-shrink-0">
      {gradientBorder ? (
        <div
          className={`${sizeClass} rounded-full p-[2px] flex-shrink-0`}
          style={{ background: 'linear-gradient(135deg, #9945FF, #14F195)' }}
        >
          <div className="w-full h-full rounded-full overflow-hidden" style={{ background: '#0a0a0f' }}>
            {src ? (
              <img src={src} alt={username} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full rounded-full flex items-center justify-center font-bold text-white"
                style={{ background: bgColor }}
              >
                {getInitials(username)}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className={`${sizeClass} rounded-full overflow-hidden flex-shrink-0`} style={{ background: bgColor }}>
          {src ? (
            <img src={src} alt={username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-white">
              {getInitials(username)}
            </div>
          )}
        </div>
      )}
      {online && (
        <span
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 animate-pulse-live"
          style={{ background: '#14F195', borderColor: '#0a0a0f' }}
        />
      )}
    </div>
  )
}
