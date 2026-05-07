import { Link, useLocation, useNavigate } from 'react-router-dom'
import ConnectButton from '../wallet/ConnectButton'

const NAV_LINKS = [
  { label: 'Games', path: '/games' },
  { label: 'Leaderboard', path: '/leaderboard' },
]

function GradientArrow({ direction, onClick, disabled }: {
  direction: 'back' | 'forward'
  onClick: () => void
  disabled: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === 'back' ? 'Go back' : 'Go forward'}
      className="flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed hover:scale-110"
      style={{
        background: disabled ? 'transparent' : 'rgba(153,69,255,0.08)',
        border: disabled ? '1px solid #2a2a3a' : '1px solid transparent',
        backgroundImage: disabled ? 'none' : 'linear-gradient(#13131a, #13131a), linear-gradient(135deg, #9945FF, #14F195)',
        backgroundOrigin: 'border-box',
        backgroundClip: disabled ? undefined : 'padding-box, border-box',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        {direction === 'back'
          ? <path d="M8 2L4 6L8 10" stroke="url(#sol-grad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          : <path d="M4 2L8 6L4 10" stroke="url(#sol-grad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        }
        <defs>
          <linearGradient id="sol-grad" x1="0" y1="0" x2="0" y2="12" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9945FF" />
            <stop offset="1" stopColor="#14F195" />
          </linearGradient>
        </defs>
      </svg>
    </button>
  )
}

export default function Header() {
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const canGoBack = window.history.state?.idx > 0
  const canGoForward = window.history.state?.idx < (window.history.length - 1)

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-[60px]"
      style={{
        background: 'rgba(10,10,15,0.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 select-none" aria-label="Solchess home">
        <span className="text-xl">♞</span>
        <span className="text-lg font-bold tracking-tight">
          <span className="text-white">Sol</span>
          <span style={{ color: '#14F195' }}>chess</span>
        </span>
      </Link>

      {/* Nav */}
      <nav className="flex items-center gap-3" aria-label="Main navigation">
        {/* Back / Forward */}
        <GradientArrow direction="back" onClick={() => navigate(-1)} disabled={!canGoBack} />

        {NAV_LINKS.map((link) => {
          const active = pathname === link.path
          const tourId = link.label === 'Games' ? 'tour-nav-games' : link.label === 'Leaderboard' ? 'tour-nav-leaderboard' : undefined
          return (
            <Link
              key={link.path}
              id={tourId}
              to={link.path}
              className="text-sm font-medium transition-colors"
              style={{ color: active ? '#ffffff' : '#8888aa' }}
              aria-current={active ? 'page' : undefined}
            >
              {link.label}
              {active && (
                <div
                  className="h-[2px] mt-0.5 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #9945FF, #14F195)' }}
                />
              )}
            </Link>
          )
        })}

		<GradientArrow direction="forward" onClick={() => navigate(1)} disabled={!canGoForward} />
      </nav>

      {/* Wallet */}
      <div id="tour-connect-wallet">
        <ConnectButton />
      </div>
    </header>
  )
}
