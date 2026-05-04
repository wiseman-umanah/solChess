import { Link, useLocation } from 'react-router-dom'
import ConnectButton from '../wallet/ConnectButton'

const NAV_LINKS = [
  { label: 'Games', path: '/games' },
  { label: 'Leaderboard', path: '/leaderboard' },
]

export default function Header() {
  const { pathname } = useLocation()

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
      <nav className="flex items-center gap-6" aria-label="Main navigation">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.path
          return (
            <Link
              key={link.path}
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
      </nav>

      {/* Wallet */}
      <ConnectButton />
    </header>
  )
}
