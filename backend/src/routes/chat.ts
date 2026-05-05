import type { FastifyInstance } from 'fastify'
import prisma from '../db/prisma.js'

export default async function chatRoutes(app: FastifyInstance) {
  // World chat history
  app.get<{ Querystring: { limit?: string } }>('/chat/world', async (req) => {
    const limit = Math.min(parseInt(req.query.limit ?? '100'), 200)
    return prisma.message.findMany({
      where: { room: 'world' },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: { sender: { select: { username: true, avatar: true } } },
    })
  })

  // DM history between two wallets
  // DM history — requires ?with=<otherWallet>
  app.get<{ Params: { wallet: string }; Querystring: { with: string; limit?: string } }>(
    '/chat/:wallet',
    async (req, reply) => {
      const { with: other, limit: limitStr } = req.query
      if (!other) return reply.status(400).send({ error: 'Missing ?with=<wallet>' })
      const limit = Math.min(parseInt(limitStr ?? '50'), 100)
      const room = [req.params.wallet, other].sort().join(':')
      return prisma.message.findMany({
        where: { room },
        orderBy: { timestamp: 'desc' },
        take: limit,
        include: { sender: { select: { username: true, avatar: true } } },
      })
    },
  )
}
