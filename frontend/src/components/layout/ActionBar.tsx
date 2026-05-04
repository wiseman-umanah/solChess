import { useNavigate } from 'react-router-dom'
import DoubleButton from '../ui/DoubleButton'

const ACTIONS = [
  { label: 'Create', icon: '♟', offsetColor: 'purple' as const, path: '/create' },
  { label: 'Join', icon: '→', offsetColor: 'green' as const, path: '/join' },
  { label: 'Host', icon: '⬡', offsetColor: 'purple' as const, path: '/host' },
  { label: 'Puzzles', icon: '◈', offsetColor: 'green' as const, path: '/puzzles' },
  { label: 'Practice (AI)', icon: '⚙', offsetColor: 'purple' as const, path: '/practice' },
  { label: 'Practice (Friend)', icon: '♥', offsetColor: 'green' as const, path: '/practice' },
] as const

export default function ActionBar() {
  const navigate = useNavigate()

  return (
    <div
      className="fixed bottom-0 left-[350px] right-[350px] h-[80px] flex items-center justify-around px-4 z-40"
      style={{
        background: 'rgba(10,10,15,0.9)',
        backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
      role="toolbar"
      aria-label="Game actions"
    >
      {ACTIONS.map((action) => (
        <DoubleButton
          key={action.label}
          offsetColor={action.offsetColor}
          size="sm"
          icon={<span>{action.icon}</span>}
          onClick={() => navigate(action.path)}
        >
          {action.label}
        </DoubleButton>
      ))}
    </div>
  )
}
