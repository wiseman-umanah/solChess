import type { Server, Socket } from 'socket.io'
import {
  processMove,
  processUndo,
  endGame,
  startTimer,
  pauseTimer,
  resumeTimer,
  getTimer,
  playerJoinedRoom,
  playerLeftRoom,
  getBothConnected,
} from '../services/gameService.js'
import prisma from '../db/prisma.js'

interface AuthSocket extends Socket {
  wallet?: string
}

// Undo request timeouts: gameId → timeout handle
const undoTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: AuthSocket) => {
    socket.wallet = (socket.handshake.auth as { wallet?: string }).wallet
    if (socket.wallet) socket.join(socket.wallet)

    // ── Game ──────────────────────────────────────────────────────────────

    socket.on('join-game', async ({ gameId }: { gameId: string }) => {
      socket.join(gameId)

      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: {
          white: { select: { wallet: true, username: true, trustScore: true } },
          black: { select: { wallet: true, username: true, trustScore: true } },
          moves: { orderBy: { timestamp: 'asc' } },
        },
      })
      if (!game) return socket.emit('error', { message: 'Game not found' })

      // Block spectators from practice games
      if (game.isPractice && socket.wallet !== game.whiteWallet && socket.wallet !== game.blackWallet) {
        socket.leave(gameId)
        return socket.emit('error', { message: 'Private game' })
      }

      // Track connected players
      if (socket.wallet && (socket.wallet === game.whiteWallet || socket.wallet === game.blackWallet)) {
        playerJoinedRoom(gameId, socket.wallet)
      }

      // For active practice games: notify the whole room so the waiting creator transitions out
      if (game.isPractice && game.status === 'ACTIVE') {
        io.to(gameId).emit('game-state', game)
      } else {
        socket.emit('game-state', game)
      }

      // Timer + both-connected (practice games, timed or untimed)
      if (game.isPractice && game.status === 'ACTIVE') {
        const bothHere = getBothConnected(gameId, game.whiteWallet, game.blackWallet)
        if (bothHere) {
          if (game.timeControl) {
            if (!getTimer(gameId)) startTimer(gameId, game.timeControl, io)
            else resumeTimer(gameId, io)
          }
          io.to(gameId).emit('both-connected', {})
        }
      }

      // Regular games: emit game-start when ACTIVE
      if (!game.isPractice && game.status === 'ACTIVE' && !getTimer(gameId) && game.timeControl) {
        startTimer(gameId, game.timeControl, io)
        io.to(gameId).emit('game-start', game)
      }

      // Spectator count (non-practice only)
      if (!game.isPractice) {
        const room = io.sockets.adapter.rooms.get(gameId)
        io.to(gameId).emit('spectator-count', { count: room?.size ?? 0 })
      }
    })

    socket.on('spectate', async ({ gameId }: { gameId: string }) => {
      // Practice games cannot be spectated
      const game = await prisma.game.findUnique({ where: { id: gameId }, select: { isPractice: true } })
      if (game?.isPractice) return socket.emit('error', { message: 'Private game' })
      socket.join(gameId)
      const room = io.sockets.adapter.rooms.get(gameId)
      io.to(gameId).emit('spectator-count', { count: room?.size ?? 0 })
    })

    socket.on(
      'make-move',
      async ({ gameId, from, to, promotion }: { gameId: string; from: string; to: string; promotion?: string }) => {
        if (!socket.wallet) return socket.emit('error', { message: 'Not authenticated' })
        try {
          await processMove(gameId, socket.wallet, from, to, promotion, io)
        } catch (e: unknown) {
          socket.emit('error', { message: e instanceof Error ? e.message : 'Move failed' })
        }
      },
    )

    socket.on('resign', async ({ gameId }: { gameId: string }) => {
      if (!socket.wallet) return
      const game = await prisma.game.findUnique({ where: { id: gameId } })
      if (!game || game.status !== 'ACTIVE') return
      const isWhite = game.whiteWallet === socket.wallet
      const winner = isWhite ? 'black' : 'white'
      await endGame(gameId, winner, 'resign', io, game.isPractice)
    })

    // ── Practice: end game (owner closes untimed game) ────────────────────

    socket.on('end-practice', async ({ gameId }: { gameId: string }) => {
      if (!socket.wallet) return
      const game = await prisma.game.findUnique({ where: { id: gameId } })
      if (!game || !game.isPractice || game.status === 'ENDED') return
      // Only a participant can end it
      if (socket.wallet !== game.whiteWallet && socket.wallet !== game.blackWallet) return
      await endGame(gameId, 'draw', 'agreement', io, true)
    })

    // ── Practice: undo request ────────────────────────────────────────────

    socket.on('request-undo', async ({ gameId }: { gameId: string }) => {
      if (!socket.wallet) return
      const game = await prisma.game.findUnique({ where: { id: gameId }, include: { moves: true } })
      if (!game || !game.isPractice || game.status !== 'ACTIVE') return
      if (game.moves.length < 2) return socket.emit('error', { message: 'Not enough moves to undo' })

      const opponentWallet = game.whiteWallet === socket.wallet ? game.blackWallet : game.whiteWallet
      if (!opponentWallet) return

      // Cancel any existing pending undo
      const existing = undoTimeouts.get(gameId)
      if (existing) clearTimeout(existing)

      // Notify opponent
      io.to(opponentWallet).emit('undo-requested', { gameId, byWallet: socket.wallet })

      // Auto-confirm after 15 seconds if no response
      const timeout = setTimeout(async () => {
        undoTimeouts.delete(gameId)
        try {
          await processUndo(gameId, io)
        } catch { /* game may have ended */ }
      }, 15_000)
      undoTimeouts.set(gameId, timeout)
    })

    socket.on('respond-undo', async ({ gameId, accept }: { gameId: string; accept: boolean }) => {
      if (!socket.wallet) return
      const timeout = undoTimeouts.get(gameId)
      if (timeout) clearTimeout(timeout)
      undoTimeouts.delete(gameId)

      if (accept) {
        try {
          await processUndo(gameId, io)
        } catch { /* game may have ended */ }
      } else {
        // Declined — notify requester, their clock keeps running
        io.to(gameId).emit('undo-declined', { byWallet: socket.wallet })
      }
    })

    // ── Chat ──────────────────────────────────────────────────────────────

    socket.on('world-chat', async ({ content }: { content: string }) => {
      if (!socket.wallet) return
      const trimmed = content?.trim().slice(0, 500)
      if (!trimmed) return
      const msg = await prisma.message.create({
        data: { room: 'world', senderWallet: socket.wallet, content: trimmed },
        include: { sender: { select: { username: true } } },
      })
      io.emit('world-message', msg)
    })

    socket.on('private-chat', async ({ toWallet, content }: { toWallet: string; content: string }) => {
      if (!socket.wallet) return
      const trimmed = content?.trim().slice(0, 500)
      if (!trimmed) return
      const room = [socket.wallet, toWallet].sort().join(':')
      const msg = await prisma.message.create({
        data: { room, senderWallet: socket.wallet, content: trimmed },
        include: { sender: { select: { username: true } } },
      })
      io.to(socket.wallet).to(toWallet).emit('private-message', { ...msg, fromWallet: socket.wallet })
    })

    // ── Disconnect ────────────────────────────────────────────────────────

    socket.on('disconnect', async () => {
      if (!socket.wallet) return

      // Update spectator count for all rooms
      socket.rooms.forEach((room) => {
        if (room !== socket.id && room !== socket.wallet) {
          const r = io.sockets.adapter.rooms.get(room)
          io.to(room).emit('spectator-count', { count: r?.size ?? 0 })
        }
      })

      // Handle practice timed game disconnection
      for (const room of socket.rooms) {
        if (room === socket.id || room === socket.wallet) continue

        const game = await prisma.game.findUnique({
          where: { id: room },
          include: { moves: true },
        }).catch(() => null)

        if (!game || game.status !== 'ACTIVE') continue

        playerLeftRoom(room, socket.wallet)

        if (game.isPractice) {
          if (game.timeControl) {
            // Timed practice: if both had made at least 1 move each (≥2 plies), auto-win opponent
            if (game.moves.length >= 2) {
              const isWhite = game.whiteWallet === socket.wallet
              const winner = isWhite ? 'black' : 'white'
              await endGame(room, winner, 'disconnect', io, true)
            } else {
              // Not enough moves yet — just pause timer
              pauseTimer(room)
              io.to(room).emit('opponent-disconnected', { wallet: socket.wallet })
            }
          } else {
            // Untimed practice: just notify, game stays open
            io.to(room).emit('opponent-disconnected', { wallet: socket.wallet })
          }
        }
      }
    })
  })
}