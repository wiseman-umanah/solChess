import React, { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  width?: string
}

export default function Modal({ open, onClose, children, width = '480px' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="relative p-6 flex flex-col gap-5 w-full mx-4"
        style={{
          maxWidth: width,
          background: '#13131a',
          border: '1.5px solid #2a2a3a',
          boxShadow: '0 0 80px rgba(153,69,255,0.15)',
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-lg leading-none hover:opacity-60 transition-opacity"
          style={{ color: '#8888aa' }}
          aria-label="Close"
        >
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}
