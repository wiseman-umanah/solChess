import { create } from 'zustand'
import type { Move, Player } from '../types'

interface GameState {
  currentGameId: string | null
  gameStatus: 'idle' | 'waiting' | 'active' | 'ended'
  board: string
  fenHistory: string[]
  moveHistory: Move[]
  players: { white: Player; black: Player } | null
  prizePool: number
  stakes: { white: number; black: number }
  spectatorCount: number
  winner: 'white' | 'black' | 'draw' | null
  lastMove: { from: string; to: string } | null

  setGame: (id: string, white: Player, black: Player) => void
  setBoard: (fen: string) => void
  addMove: (move: Move) => void
  undoMoves: (plies: number) => void
  setStatus: (status: GameState['gameStatus']) => void
  setPrizePool: (amount: number) => void
  addStake: (side: 'white' | 'black', amount: number) => void
  setSpectatorCount: (count: number) => void
  setWinner: (winner: GameState['winner']) => void
  resetGame: () => void
}

const INITIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export const useGameStore = create<GameState>((set) => ({
  currentGameId: null,
  gameStatus: 'idle',
  board: INITIAL_FEN,
  fenHistory: [INITIAL_FEN],
  moveHistory: [],
  players: null,
  prizePool: 0,
  stakes: { white: 0, black: 0 },
  spectatorCount: 0,
  winner: null,
  lastMove: null,

  setGame: (id, white, black) =>
    set({ currentGameId: id, players: { white, black }, gameStatus: 'waiting', board: INITIAL_FEN, fenHistory: [INITIAL_FEN] }),

  setBoard: (fen) =>
    set((state) => ({ board: fen, fenHistory: [...state.fenHistory, fen] })),

  addMove: (move) =>
    set((state) => ({
      moveHistory: [...state.moveHistory, move],
      lastMove: { from: move.from, to: move.to },
    })),

  undoMoves: (plies) =>
    set((state) => {
      const newHistory = state.fenHistory.slice(0, Math.max(1, state.fenHistory.length - plies))
      const newBoard = newHistory[newHistory.length - 1]
      const newMoves = state.moveHistory.slice(0, Math.max(0, state.moveHistory.length - plies))
      const lastMove = newMoves.length > 0 ? { from: newMoves[newMoves.length - 1].from, to: newMoves[newMoves.length - 1].to } : null
      return { board: newBoard, fenHistory: newHistory, moveHistory: newMoves, lastMove, winner: null, gameStatus: 'active' }
    }),

  setStatus: (status) => set({ gameStatus: status }),

  setPrizePool: (amount) => set({ prizePool: amount }),

  addStake: (side, amount) =>
    set((state) => ({
      stakes: { ...state.stakes, [side]: state.stakes[side] + amount },
      prizePool: state.prizePool + amount,
    })),

  setSpectatorCount: (count) => set({ spectatorCount: count }),

  setWinner: (winner) => set({ winner, gameStatus: 'ended' }),

  resetGame: () =>
    set({
      currentGameId: null,
      gameStatus: 'idle',
      board: INITIAL_FEN,
      fenHistory: [INITIAL_FEN],
      moveHistory: [],
      players: null,
      prizePool: 0,
      stakes: { white: 0, black: 0 },
      spectatorCount: 0,
      winner: null,
      lastMove: null,
    }),
}))
