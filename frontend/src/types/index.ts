export interface Player {
  wallet: string
  username: string
  avatar?: string
  trustScore: number
  stats: PlayerStats
}

export interface PlayerStats {
  gamesPlayed: number
  gamesWon: number
  winRate: number
  totalEarnings: number
}

export interface Move {
  from: string
  to: string
  san: string
  piece: string
  color: 'w' | 'b'
  timestamp: number
}

export interface Game {
  id: string
  white: Player
  black: Player
  fen: string
  moveHistory: Move[]
  status: 'waiting' | 'active' | 'ended'
  timeControl: number
  prizePool: number
  stakes: { white: number; black: number }
  spectatorCount: number
  winner?: 'white' | 'black' | 'draw'
  createdAt: number
}

export interface Message {
  id: string
  sender: string
  senderWallet: string
  content: string
  timestamp: number
  avatar?: string
}

export type OffsetColor = 'purple' | 'green' | 'random'

export interface LiveGame {
  id: string
  whiteName: string
  blackName: string
  prizePool: number
  spectatorCount: number
  timeControl: number
}

export interface LeaderboardEntry {
  rank: number
  wallet: string
  username: string
  trustScore: number
  avatar?: string
}
