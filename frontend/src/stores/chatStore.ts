import { create } from 'zustand'
import type { Message } from '../types'

interface ChatState {
  worldMessages: Message[]
  privateChats: Record<string, Message[]>
  activePrivateChat: string | null

  addWorldMessage: (message: Message) => void
  addPrivateMessage: (wallet: string, message: Message) => void
  setActivePrivateChat: (wallet: string | null) => void
  clearPrivateChat: (wallet: string) => void
}

export const useChatStore = create<ChatState>((set) => ({
  worldMessages: [],
  privateChats: {},
  activePrivateChat: null,

  addWorldMessage: (message) =>
    set((state) => ({
      worldMessages: [...state.worldMessages.slice(-200), message],
    })),

  addPrivateMessage: (wallet, message) =>
    set((state) => ({
      privateChats: {
        ...state.privateChats,
        [wallet]: [...(state.privateChats[wallet] ?? []), message],
      },
    })),

  setActivePrivateChat: (wallet) => set({ activePrivateChat: wallet }),

  clearPrivateChat: (wallet) =>
    set((state) => {
      const updated = { ...state.privateChats }
      delete updated[wallet]
      return { privateChats: updated }
    }),
}))
