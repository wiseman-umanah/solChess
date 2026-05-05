import { Chess } from 'chess.js'
import prisma from '../db/prisma.js'
import type { Server } from 'socket.io'
import { getIo } from '../socket/io.js'

export async function broadcastGameList(io?: Server) {
  const emitter = io ?? getIo()
  if (!emitter) return
  const games = await prisma.game.findMany({
    where: { status: { in: ['WAITING', 'ACTIVE'] } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      white: { select: { wallet: true, username: true, trustScore: true } },
      black: { select: { wallet: true, username: true, trustScore: true } },
    },
  })
  emitter.emit('game-list-update', games)
}

// In-memory timer state per game
interface TimerState {
  white: number   // seconds remaining
  black: number
  turn: 'w' | 'b'
  interval: ReturnType<typeof setInterval> | null
  lastTick: number
}

const timers = new Map<string, TimerState>()

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return 'CHESS-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function createGame(whiteWallet: string, timeControl: number) {
  let code = randomCode()
  while (await prisma.game.findUnique({ where: { code } })) code = randomCode()

  const game = await prisma.game.create({
    data: { code, whiteWallet, timeControl },
    include: { white: true },
  })
  await broadcastGameList()
  return game
}

export async function joinGame(gameId: string, blackWallet: string) {
  const existing = await prisma.game.findUnique({ where: { id: gameId } })
  if (!existing) throw new Error('Game not found')
  if (existing.status !== 'WAITING') throw new Error('Game not available')
  if (existing.whiteWallet === blackWallet) throw new Error('Cannot join your own game')

  const game = await prisma.game.update({
    where: { id: gameId },
    data: { blackWallet, status: 'ACTIVE' },
    include: { white: true, black: true },
  })
  await broadcastGameList()
  return game
}

export async function joinByCode(code: string, blackWallet: string) {
  const game = await prisma.game.findUnique({ where: { code } })
  if (!game) throw new Error('Game not found')
  return joinGame(game.id, blackWallet)
}

export function startTimer(gameId: string, timeControl: number, io: Server) {
  const state: TimerState = { white: timeControl, black: timeControl, turn: 'w', interval: null, lastTick: Date.now() }
  timers.set(gameId, state)

  state.interval = setInterval(() => {
    const now = Date.now()
    const elapsed = (now - state.lastTick) / 1000
    state.lastTick = now

    if (state.turn === 'w') state.white = Math.max(0, state.white - elapsed)
    else state.black = Math.max(0, state.black - elapsed)

    io.to(gameId).emit('timer-tick', { white: Math.floor(state.white), black: Math.floor(state.black) })

    if (state.white <= 0 || state.black <= 0) {
      const loser = state.white <= 0 ? 'white' : 'black'
      const winner = loser === 'white' ? 'black' : 'white'
      stopTimer(gameId)
      endGame(gameId, winner, 'timeout', io)
    }
  }, 1000)
}

export function switchTimer(gameId: string) {
  const state = timers.get(gameId)
  if (!state) return
  state.turn = state.turn === 'w' ? 'b' : 'w'
  state.lastTick = Date.now()
}

export function stopTimer(gameId: string) {
  const state = timers.get(gameId)
  if (!state) return
  if (state.interval) clearInterval(state.interval)
  timers.delete(gameId)
}

export function getTimer(gameId: string) {
  return timers.get(gameId)
}

export async function processMove(
  gameId: string,
  wallet: string,
  from: string,
  to: string,
  promotion: string = 'q',
  io: Server,
) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { moves: { orderBy: { timestamp: 'asc' } } },
  })
  if (!game) throw new Error('Game not found')
  if (game.status !== 'ACTIVE') throw new Error('Game is not active')

  const chess = new Chess(game.fen)
  const turn = chess.turn()

  // Validate it's the right player's turn
  const isWhite = game.whiteWallet === wallet
  const isBlack = game.blackWallet === wallet
  if (!isWhite && !isBlack) throw new Error('Not a player in this game')
  if (turn === 'w' && !isWhite) throw new Error('Not your turn')
  if (turn === 'b' && !isBlack) throw new Error('Not your turn')

  const result = chess.move({ from, to, promotion })
  if (!result) throw new Error('Illegal move')

  const newFen = chess.fen()

  // Persist move + updated FEN
  await prisma.$transaction([
    prisma.move.create({
      data: { gameId, from, to, san: result.san, piece: result.piece, color: result.color },
    }),
    prisma.game.update({ where: { id: gameId }, data: { fen: newFen } }),
  ])

  switchTimer(gameId)

  const moveData = { from, to, san: result.san, piece: result.piece, color: result.color }

  if (chess.isGameOver()) {
    stopTimer(gameId)
    let winner: string
    let reason: string
    if (chess.isCheckmate()) {
      winner = turn === 'w' ? 'white' : 'black' // the side that just moved wins
      reason = 'checkmate'
    } else {
      winner = 'draw'
      reason = chess.isStalemate() ? 'stalemate' : chess.isDraw() ? 'draw' : 'draw'
    }
    await endGame(gameId, winner, reason, io)
    return { move: moveData, fen: newFen, gameOver: true, winner, reason }
  }

  io.to(gameId).emit('opponent-move', { move: moveData, fen: newFen, turn: chess.turn() })
  return { move: moveData, fen: newFen, gameOver: false }
}

export async function endGame(gameId: string, winner: string, reason: string, io: Server) {
  stopTimer(gameId)
  const game = await prisma.game.update({
    where: { id: gameId },
    data: { status: 'ENDED', winner, endReason: reason, endedAt: new Date() },
  })
  await updateStats(game.whiteWallet, game.blackWallet, winner)
  io.to(gameId).emit('game-end', { winner, reason })
  return game
}

async function updateStats(whiteWallet: string, blackWallet: string | null, winner: string) {
  if (!blackWallet) return

  const whiteWon = winner === 'white'
  const blackWon = winner === 'black'

  await prisma.$transaction([
    prisma.userStats.upsert({
      where: { wallet: whiteWallet },
      update: {
        gamesPlayed: { increment: 1 },
        gamesWon: { increment: whiteWon ? 1 : 0 },
      },
      create: { wallet: whiteWallet, gamesPlayed: 1, gamesWon: whiteWon ? 1 : 0 },
    }),
    prisma.userStats.upsert({
      where: { wallet: blackWallet },
      update: {
        gamesPlayed: { increment: 1 },
        gamesWon: { increment: blackWon ? 1 : 0 },
      },
      create: { wallet: blackWallet, gamesPlayed: 1, gamesWon: blackWon ? 1 : 0 },
    }),
  ])

  // Recalculate win rates
  for (const wallet of [whiteWallet, blackWallet]) {
    const stats = await prisma.userStats.findUnique({ where: { wallet } })
    if (!stats) continue
    const winRate = stats.gamesPlayed > 0 ? (stats.gamesWon / stats.gamesPlayed) * 100 : 0
    await prisma.userStats.update({ where: { wallet }, data: { winRate } })
    // Trust score = weighted blend of win rate + games played (capped at 99)
    const trustScore = Math.min(99, Math.floor(winRate * 0.6 + Math.min(stats.gamesPlayed, 200) * 0.2))
    await prisma.user.update({ where: { wallet }, data: { trustScore } })
  }
}
