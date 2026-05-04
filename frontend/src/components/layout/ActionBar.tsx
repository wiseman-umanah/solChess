import { useState } from 'react'
import DoubleButton from '../ui/DoubleButton'
import CreateModal from '../modals/CreateModal'
import JoinModal from '../modals/JoinModal'
import PracticeAIModal from '../modals/PracticeAIModal'

type ModalState = 'create' | 'join' | 'host' | 'practiceAI' | 'friend' | null

export default function ActionBar() {
  const [modal, setModal] = useState<ModalState>(null)

  return (
    <>
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
        <DoubleButton offsetColor="purple" size="sm" icon={<span>♟</span>} onClick={() => setModal('create')}>Create</DoubleButton>
        <DoubleButton offsetColor="green"  size="sm" icon={<span>→</span>}  onClick={() => setModal('join')}>Join</DoubleButton>
        <DoubleButton offsetColor="purple" size="sm" icon={<span>⬡</span>}  onClick={() => setModal('host')}>Host</DoubleButton>
        <DoubleButton offsetColor="green"  size="sm" icon={<span>◈</span>}  onClick={() => {}}>Puzzles</DoubleButton>
        <DoubleButton offsetColor="purple" size="sm" icon={<span>⚙</span>}  onClick={() => setModal('practiceAI')}>Practice (AI)</DoubleButton>
        <DoubleButton offsetColor="green"  size="sm" icon={<span>♥</span>}  onClick={() => setModal('friend')}>Practice (Friend)</DoubleButton>
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
      <CreateModal
        open={modal === 'friend'}
        mode="friend"
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
