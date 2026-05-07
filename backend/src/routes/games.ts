import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/auth.js'
import prisma from '../db/prisma.js'
import { createGame, joinGame, joinByCode } from '../services/gameService.js'

const gameInclude = {
  white: { select: { wallet: true, username: true, trustScore: true, stats: true } },
  black: { select: { wallet: true, username: true, trustScore: true, stats: true } },
  moves: { orderBy: { timestamp: 'asc' as const } },
}

export default async function gameRoutes(app: FastifyInstance) {
  // List public games (never includes practice)
  app.get<{ Querystring: { status?: string; limit?: string; offset?: string } }>('/games', async (req) => {
    const { status, limit = '20', offset = '0' } = req.query
    const where: Record<string, unknown> = { isPractice: false }
    if (status) where.status = status.toUpperCase()
    const games = await prisma.game.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit), 50),
      skip: parseInt(offset),
      include: gameInclude,
    })
    return games
  })

  // My unfinished practice games (auth required)
  app.get('/games/my-practice', { preHandler: requireAuth }, async (req) => {
    const { wallet } = req.user as { wallet: string }
    const games = await prisma.game.findMany({
      where: {
        isPractice: true,
        status: { in: ['WAITING', 'ACTIVE'] },
        winner: null,
        OR: [{ whiteWallet: wallet }, { blackWallet: wallet }],
      },
      orderBy: { createdAt: 'desc' },
      include: gameInclude,
    })
    return games
  })

  // Get single game (players only for practice)
  app.get<{ Params: { id: string } }>('/games/:id', async (req, reply) => {
    const game = await prisma.game.findUnique({ where: { id: req.params.id }, include: gameInclude })
    if (!game) return reply.status(404).send({ error: 'Game not found' })
    return game
  })

  // Create game (auth required)
  app.post<{
    Body: {
      timeControl?: number | null
      isPractice?: boolean
      isHosted?: boolean
      creatorColor?: 'white' | 'black'
    }
  }>(
    '/games',
    { preHandler: requireAuth },
    async (req, reply) => {
      const { wallet } = req.user as { wallet: string }
      const { timeControl = 300, isPractice = false, isHosted = false, creatorColor = 'white' } = req.body

      if (!isHosted && !isPractice && creatorColor && !['white', 'black'].includes(creatorColor)) {
        return reply.status(400).send({ error: 'Invalid color' })
      }

      const tc = timeControl === null || timeControl === 0 ? null : (timeControl ?? 300)
      const game = await createGame(wallet, tc, isPractice, creatorColor, isHosted)
      return { gameId: game.id, code: game.code, game }
    },
  )

  // Join game by ID or code (auth required)
  app.post<{ Params: { id: string }; Body: { code?: string } }>(
    '/games/:id/join',
    { preHandler: requireAuth },
    async (req, reply) => {
      const { wallet } = req.user as { wallet: string }
      try {
        const game = req.params.id === 'by-code' && req.body.code
          ? await joinByCode(req.body.code, wallet)
          : await joinGame(req.params.id, wallet)
        return game
      } catch (e: unknown) {
        return reply.status(400).send({ error: e instanceof Error ? e.message : 'Join failed' })
      }
    },
  )

  // Add stake (auth required, public games only)
  app.post<{ Params: { id: string }; Body: { side: 'white' | 'black'; amount: number } }>(
    '/games/:id/stake',
    { preHandler: requireAuth },
    async (req, reply) => {
      const { wallet } = req.user as { wallet: string }
      const { side, amount } = req.body
      if (!['white', 'black'].includes(side) || amount < 0.01) {
        return reply.status(400).send({ error: 'Invalid stake' })
      }
      const game = await prisma.game.findUnique({ where: { id: req.params.id } })
      if (!game || game.status === 'ENDED' || game.isPractice) {
        return reply.status(400).send({ error: 'Game not available' })
      }

      await prisma.stake.create({ data: { gameId: game.id, wallet, side, amount } })
      const updated = await prisma.game.update({
        where: { id: game.id },
        data: {
          stakesWhite: side === 'white' ? { increment: amount } : undefined,
          stakesBlack: side === 'black' ? { increment: amount } : undefined,
        },
      })
      return { stakesWhite: updated.stakesWhite, stakesBlack: updated.stakesBlack }
    },
  )

  // Support / prize pool (public games only)
  app.post<{ Params: { id: string }; Body: { amount: number } }>(
    '/games/:id/support',
    { preHandler: requireAuth },
    async (req, reply) => {
      const { wallet } = req.user as { wallet: string }
      const { amount } = req.body
      if (amount < 0.01) return reply.status(400).send({ error: 'Min 0.01 SOL' })
      const game = await prisma.game.findUnique({ where: { id: req.params.id } })
      if (!game || game.status === 'ENDED' || game.isPractice) {
        return reply.status(400).send({ error: 'Game not available' })
      }

      await prisma.stake.create({ data: { gameId: game.id, wallet, side: 'support', amount } })
      const updated = await prisma.game.update({
        where: { id: game.id },
        data: { prizePool: { increment: amount } },
      })
      return { prizePool: updated.prizePool }
    },
  )
}