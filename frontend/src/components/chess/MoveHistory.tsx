import { useEffect, useRef } from 'react'
import type { Move } from '../../types'

interface MoveHistoryProps {
  moves: Move[]
  currentMoveIndex?: number
}

export default function MoveHistory({ moves, currentMoveIndex }: MoveHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [moves])

  const pairs: Array<{ white?: Move; black?: Move; number: number }> = []
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({ white: moves[i], black: moves[i + 1], number: Math.floor(i / 2) + 1 })
  }

  return (
    <div className="flex flex-col h-full">
      <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#8888aa' }}>
        Move History
      </p>
      <div className="flex-1 overflow-y-auto min-h-0">
        {pairs.length === 0 ? (
          <p className="text-xs text-center py-4" style={{ color: '#8888aa' }}>
            No moves yet
          </p>
        ) : (
          <div className="space-y-0.5">
            {pairs.map((pair) => {
              const whiteIdx = (pair.number - 1) * 2
              const blackIdx = whiteIdx + 1
              return (
                <div key={pair.number} className="flex items-center gap-1 text-xs font-mono">
                  <span className="w-6 text-right flex-shrink-0" style={{ color: '#8888aa' }}>
                    {pair.number}.
                  </span>
                  {pair.white && (
                    <span
                      className={`flex-1 px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 ${
                        currentMoveIndex === whiteIdx ? 'font-bold' : ''
                      }`}
                      style={{
                        background: currentMoveIndex === whiteIdx ? 'rgba(153,69,255,0.2)' : 'transparent',
                        color: currentMoveIndex === whiteIdx ? '#9945FF' : '#ffffff',
                      }}
                    >
                      {pair.white.san}
                    </span>
                  )}
                  {pair.black && (
                    <span
                      className={`flex-1 px-1.5 py-0.5 rounded cursor-pointer hover:opacity-80 ${
                        currentMoveIndex === blackIdx ? 'font-bold' : ''
                      }`}
                      style={{
                        background: currentMoveIndex === blackIdx ? 'rgba(153,69,255,0.2)' : 'transparent',
                        color: currentMoveIndex === blackIdx ? '#9945FF' : '#ffffff',
                      }}
                    >
                      {pair.black.san}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
