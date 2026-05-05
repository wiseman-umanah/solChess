import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/auth.js'
import prisma from '../db/prisma.js'
import { createGame, joinGame, joinByCode } from '../services/gameService.js'

const gameInclude = {
  white: { select: { wallet: true, username: true, avatar: true, trustScore: true, stats: true } },
  black: { select: { wallet: true, username: true, avatar: true, trustScore: true, stats: true } },
  moves: { orderBy: { timestamp: 'asc' as const } },
}

export default async function gameRoutes(app: FastifyInstance) {
  // List games
  app.get<{ Querystring: { status?: string; limit?: string; offset?: string } }>('/games', async (req) => {
    const { status, limit = '20', offset = '0' } = req.query
    const where = status ? { status: status.toUpperCase() as 'WAITING' | 'ACTIVE' | 'ENDED' } : {}
    const games = await prisma.game.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(parseInt(limit), 50),
      skip: parseInt(offset),
      include: gameInclude,
    })
    return games
  })

  // Get single game
  app.get<{ Params: { id: string } }>('/games/:id', async (req, reply) => {
    const game = await prisma.game.findUnique({ where: { id: req.params.id }, include: gameInclude })
    if (!game) return reply.status(404).send({ error: 'Game not found' })
    return game
  })

  // Create game (auth required)
  app.post<{ Body: { timeControl: number } }>(
    '/games',
    { preHandler: requireAuth },
    async (req, reply) => {
      const { wallet } = req.user as { wallet: string }
      const { timeControl = 300 } = req.body
      if (![60, 180, 300, 600, 1800].includes(timeControl)) {
        return reply.status(400).send({ error: 'Invalid time control' })
      }
      const game = await createGame(wallet, timeControl)
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

  // Add stake (auth required)
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
      if (!game || game.status === 'ENDED') return reply.status(400).send({ error: 'Game not available' })

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

  // Add to prize pool / support (auth required)
  app.post<{ Params: { id: string }; Body: { amount: number } }>(
    '/games/:id/support',
    { preHandler: requireAuth },
    async (req, reply) => {
      const { wallet } = req.user as { wallet: string }
      const { amount } = req.body
      if (amount < 0.01) return reply.status(400).send({ error: 'Min 0.01 SOL' })
      const game = await prisma.game.findUnique({ where: { id: req.params.id } })
      if (!game || game.status === 'ENDED') return reply.status(400).send({ error: 'Game not available' })

      await prisma.stake.create({ data: { gameId: game.id, wallet, side: 'support', amount } })
      const updated = await prisma.game.update({
        where: { id: game.id },
        data: { prizePool: { increment: amount } },
      })
      return { prizePool: updated.prizePool }
    },
  )
}
