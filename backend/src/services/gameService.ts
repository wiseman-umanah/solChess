import { Chess } from 'chess.js'
import prisma from '../db/prisma.js'
import type { Server } from 'socket.io'
import { getIo } from '../socket/io.js'

export async function broadcastGameList(io?: Server) {
  const emitter = io ?? getIo()
  if (!emitter) return
  const games = await prisma.game.findMany({
    where: { status: { in: ['WAITING', 'ACTIVE'] }, isPractice: false },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      white: { select: { wallet: true, username: true, trustScore: true } },
      black: { select: { wallet: true, username: true, trustScore: true } },
    },
  })
  emitter.emit('game-list-update', games)
}

// ── Timer state ───────────────────────────────────────────────────────────────

interface TimerState {
  white: number
  black: number
  turn: 'w' | 'b'
  interval: ReturnType<typeof setInterval> | null
  lastTick: number
}

const timers = new Map<string, TimerState>()

// ── Connected-players tracking ────────────────────────────────────────────────
// Maps gameId → Set of wallets currently in the socket room
const connectedPlayers = new Map<string, Set<string>>()

export function playerJoinedRoom(gameId: string, wallet: string) {
  if (!connectedPlayers.has(gameId)) connectedPlayers.set(gameId, new Set())
  connectedPlayers.get(gameId)!.add(wallet)
}

export function playerLeftRoom(gameId: string, wallet: string) {
  connectedPlayers.get(gameId)?.delete(wallet)
}

export function getBothConnected(gameId: string, whiteWallet: string, blackWallet: string | null): boolean {
  if (!blackWallet) return false
  const room = connectedPlayers.get(gameId)
  return !!(room?.has(whiteWallet) && room?.has(blackWallet))
}

// ── Code generation ───────────────────────────────────────────────────────────

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return 'CHESS-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ── Game CRUD ─────────────────────────────────────────────────────────────────

export async function createGame(
  wallet: string,
  timeControl: number | null,
  isPractice = false,
  creatorColor: 'white' | 'black' = 'white',
  isHosted = false,
) {
  let code = randomCode()
  while (await prisma.game.findUnique({ where: { code } })) code = randomCode()

  // Hosted: host is spectator-only, both player slots are empty
  // Regular/Practice: creator occupies their chosen color slot
  const whiteWallet = isHosted ? null : (creatorColor === 'white' ? wallet : null)
  const blackWallet = isHosted ? null : (creatorColor === 'black' ? wallet : null)
  const hostWallet  = isHosted ? wallet : null

  const game = await prisma.game.create({
    data: {
      code,
      whiteWallet,
      blackWallet: blackWallet ?? undefined,
      timeControl,
      isPractice,
      isHosted,
      hostWallet,
      creatorColor: isHosted ? 'host' : creatorColor,
    },
    include: { white: true, black: true },
  })

  if (!isPractice) await broadcastGameList()
  return game
}

export async function joinGame(gameId: string, joinerWallet: string) {
  const existing = await prisma.game.findUnique({ where: { id: gameId } })
  if (!existing) throw new Error('Game not found')
  if (existing.status !== 'WAITING') throw new Error('Game not available')
  if (existing.whiteWallet === joinerWallet || existing.blackWallet === joinerWallet) {
    throw new Error('Already in this game')
  }
  if (existing.isHosted && existing.hostWallet === joinerWallet) {
    throw new Error('Host cannot join as a player')
  }

  // Fill first empty slot; only go ACTIVE once both players are present
  const isWhiteEmpty = !existing.whiteWallet
  const newWhite = isWhiteEmpty ? joinerWallet : existing.whiteWallet
  const newBlack = isWhiteEmpty ? existing.blackWallet : joinerWallet
  const newStatus = newWhite && newBlack ? 'ACTIVE' : 'WAITING'

  const game = await prisma.game.update({
    where: { id: gameId },
    data: {
      whiteWallet: newWhite,
      blackWallet: newBlack ?? undefined,
      status: newStatus,
    },
    include: { white: true, black: true },
  })

  if (!existing.isPractice) await broadcastGameList()
  return game
}

export async function joinByCode(code: string, joinerWallet: string) {
  const game = await prisma.game.findUnique({ where: { code } })
  if (!game) throw new Error('Game not found')
  return joinGame(game.id, joinerWallet)
}

// ── Timers ────────────────────────────────────────────────────────────────────

export function startTimer(gameId: string, timeControl: number, io: Server) {
  if (timers.has(gameId)) return // already running
  const state: TimerState = {
    white: timeControl,
    black: timeControl,
    turn: 'w',
    interval: null,
    lastTick: Date.now(),
  }
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

export function pauseTimer(gameId: string) {
  const state = timers.get(gameId)
  if (!state || !state.interval) return
  clearInterval(state.interval)
  state.interval = null
}

export function resumeTimer(gameId: string, io: Server) {
  const state = timers.get(gameId)
  if (!state || state.interval) return
  state.lastTick = Date.now()
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

// ── Move processing ───────────────────────────────────────────────────────────

export async function processMove(
  gameId: string,
  wallet: string,
  from: string,
  to: string,
  promotion = 'q',
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

  const isWhite = game.whiteWallet === wallet
  const isBlack = game.blackWallet === wallet
  if (!isWhite && !isBlack) throw new Error('Not a player in this game')
  if (turn === 'w' && !isWhite) throw new Error('Not your turn')
  if (turn === 'b' && !isBlack) throw new Error('Not your turn')

  const result = chess.move({ from, to, promotion })
  if (!result) throw new Error('Illegal move')

  const newFen = chess.fen()

  await prisma.$transaction([
    prisma.move.create({
      data: { gameId, from, to, san: result.san, piece: result.piece, color: result.color },
    }),
    prisma.game.update({ where: { id: gameId }, data: { fen: newFen } }),
  ])

  if (game.timeControl) switchTimer(gameId)

  const moveData = { from, to, san: result.san, piece: result.piece, color: result.color }

  if (chess.isGameOver()) {
    if (game.timeControl) stopTimer(gameId)
    let winner: string
    let reason: string
    if (chess.isCheckmate()) {
      winner = turn === 'w' ? 'white' : 'black'
      reason = 'checkmate'
    } else {
      winner = 'draw'
      reason = chess.isStalemate() ? 'stalemate' : 'draw'
    }
    await endGame(gameId, winner, reason, io, game.isPractice)
    return { move: moveData, fen: newFen, gameOver: true, winner, reason }
  }

  io.to(gameId).emit('opponent-move', { move: moveData, fen: newFen, turn: chess.turn() })
  return { move: moveData, fen: newFen, gameOver: false }
}

// ── Undo (practice only) ──────────────────────────────────────────────────────

export async function processUndo(gameId: string, io: Server) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { moves: { orderBy: { timestamp: 'asc' } } },
  })
  if (!game || !game.isPractice) throw new Error('Undo not allowed')
  if (game.status !== 'ACTIVE') throw new Error('Game is not active')

  const moves = game.moves
  if (moves.length < 2) throw new Error('Not enough moves to undo')

  // Remove last 2 moves (both players' last ply)
  const toRemove = moves.slice(-2).map((m) => m.id)
  await prisma.move.deleteMany({ where: { id: { in: toRemove } } })

  // Replay remaining moves from start to get correct FEN
  const remaining = moves.slice(0, -2)
  const chess = new Chess()
  for (const m of remaining) chess.move({ from: m.from, to: m.to, promotion: 'q' })
  const newFen = chess.fen()

  await prisma.game.update({ where: { id: gameId }, data: { fen: newFen } })

  io.to(gameId).emit('undo-confirmed', { fen: newFen, moveCount: remaining.length })
  return newFen
}

// ── End game ──────────────────────────────────────────────────────────────────

export async function endGame(
  gameId: string,
  winner: string,
  reason: string,
  io: Server,
  isPractice = false,
) {
  stopTimer(gameId)
  const game = await prisma.game.update({
    where: { id: gameId },
    data: { status: 'ENDED', winner, endReason: reason, endedAt: new Date() },
  })
  // Don't affect stats for practice games
  if (!isPractice) await updateStats(game.whiteWallet, game.blackWallet, winner)
  io.to(gameId).emit('game-end', { winner, reason })
  return game
}

async function updateStats(whiteWallet: string | null, blackWallet: string | null, winner: string) {
  if (!whiteWallet || !blackWallet) return
  const whiteWon = winner === 'white'
  const blackWon = winner === 'black'

  await prisma.$transaction([
    prisma.userStats.upsert({
      where: { wallet: whiteWallet },
      update: { gamesPlayed: { increment: 1 }, gamesWon: { increment: whiteWon ? 1 : 0 } },
      create: { wallet: whiteWallet, gamesPlayed: 1, gamesWon: whiteWon ? 1 : 0 },
    }),
    prisma.userStats.upsert({
      where: { wallet: blackWallet },
      update: { gamesPlayed: { increment: 1 }, gamesWon: { increment: blackWon ? 1 : 0 } },
      create: { wallet: blackWallet, gamesPlayed: 1, gamesWon: blackWon ? 1 : 0 },
    }),
  ])

  for (const wallet of [whiteWallet, blackWallet]) {
    const stats = await prisma.userStats.findUnique({ where: { wallet } })
    if (!stats) continue
    const winRate = stats.gamesPlayed > 0 ? (stats.gamesWon / stats.gamesPlayed) * 100 : 0
    await prisma.userStats.update({ where: { wallet }, data: { winRate } })
    const trustScore = Math.min(99, Math.floor(winRate * 0.6 + Math.min(stats.gamesPlayed, 200) * 0.2))
    await prisma.user.update({ where: { wallet }, data: { trustScore } })
  }
}