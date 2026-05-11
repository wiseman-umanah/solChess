import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import DoubleButton from '../ui/DoubleButton'
import CreateModal from '../modals/CreateModal'
import JoinModal from '../modals/JoinModal'
import PracticeAIModal from '../modals/PracticeAIModal'
import PracticeFriendModal from '../modals/PracticeFriendModal'
import { useAuthStore } from '../../stores/authStore'

type ModalState = 'create' | 'join' | 'host' | 'practiceAI' | 'friend' | null

export default function ActionBar() {
  const [modal, setModal] = useState<ModalState>(null)
  const navigate = useNavigate()
  const { setVisible } = useWalletModal()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated())

  function requireAuth(action: () => void) {
    if (!isAuthenticated) { setVisible(true); return }
    action()
  }

  return (
    <>
      <div
        className="hidden md:flex fixed bottom-0 left-[350px] right-[350px] h-[80px] items-center justify-around px-4 z-40"
        style={{
          background: 'rgba(10,10,15,0.9)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
        role="toolbar"
        aria-label="Game actions"
      >
        <DoubleButton id="tour-create-btn"         offsetColor="purple" size="sm" icon={<span>♟</span>} onClick={() => requireAuth(() => setModal('create'))}>Create</DoubleButton>
        <DoubleButton id="tour-join-btn"           offsetColor="green"  size="sm" icon={<span>→</span>}  onClick={() => requireAuth(() => setModal('join'))}>Join</DoubleButton>
        <DoubleButton id="tour-host-btn"           offsetColor="purple" size="sm" icon={<span>⬡</span>}  onClick={() => requireAuth(() => setModal('host'))}>Host</DoubleButton>
        <DoubleButton id="tour-puzzles-btn"        offsetColor="green"  size="sm" icon={<span>◈</span>}  onClick={() => navigate('/puzzles')}>Puzzles</DoubleButton>
        <DoubleButton id="tour-practice-ai-btn"    offsetColor="purple" size="sm" icon={<span>⚙</span>}  onClick={() => setModal('practiceAI')}>Practice (AI)</DoubleButton>
        <DoubleButton id="tour-practice-friend-btn" offsetColor="green"  size="sm" icon={<span>♥</span>}  onClick={() => requireAuth(() => setModal('friend'))}>Practice (Friend)</DoubleButton>
      </div>

      <CreateModal
        open={modal === 'create'}
        mode="create"
        onClose={() => setModal(null)}
      />
      <CreateModal
        open={modal === 'host'}
        mode="host"
        onClose={() => setModal(null)}
      />
      <PracticeFriendModal
        open={modal === 'friend'}
        onClose={() => setModal(null)}
      />
      <JoinModal
        open={modal === 'join'}
        onClose={() => setModal(null)}
      />
      <PracticeAIModal
        open={modal === 'practiceAI'}
        onClose={() => setModal(null)}
      />
    </>
  )
}
