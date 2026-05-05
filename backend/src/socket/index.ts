import type { Server, Socket } from 'socket.io'
import { processMove, endGame, startTimer, getTimer } from '../services/gameService.js'
import prisma from '../db/prisma.js'

interface AuthSocket extends Socket {
  wallet?: string
}

export function registerSocketHandlers(io: Server) {
  io.on('connection', (socket: AuthSocket) => {
    // Wallet passed as auth handshake
    socket.wallet = (socket.handshake.auth as { wallet?: string }).wallet

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

      socket.emit('game-state', game)

      // Start timer when both players are present and game just became ACTIVE
      if (game.status === 'ACTIVE' && !getTimer(gameId)) {
        startTimer(gameId, game.timeControl, io)
        io.to(gameId).emit('game-start', game)
      }

      // Update spectator count
      const room = io.sockets.adapter.rooms.get(gameId)
      const count = room ? room.size : 0
      io.to(gameId).emit('spectator-count', { count })
    })

    socket.on('spectate', async ({ gameId }: { gameId: string }) => {
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
      if (!socket.wallet) return socket.emit('error', { message: 'Not authenticated' })
      const game = await prisma.game.findUnique({ where: { id: gameId } })
      if (!game || game.status !== 'ACTIVE') return
      const isWhite = game.whiteWallet === socket.wallet
      const winner = isWhite ? 'black' : 'white'
      await endGame(gameId, winner, 'resign', io)
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

      // Emit to both participants' personal rooms (they join a room named by their wallet on connect)
      io.to(socket.wallet).to(toWallet).emit('private-message', { ...msg, fromWallet: socket.wallet })
    })

    // ── Personal room (for DMs) ───────────────────────────────────────────

    if (socket.wallet) socket.join(socket.wallet)

    socket.on('disconnect', () => {
      // Spectator count update for any game rooms this socket was in
      socket.rooms.forEach((room) => {
        if (room !== socket.id) {
          const r = io.sockets.adapter.rooms.get(room)
          io.to(room).emit('spectator-count', { count: r?.size ?? 0 })
        }
      })
    })
  })
}
