import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/auth.js'
import prisma from '../db/prisma.js'

const publicSelect = {
  wallet: true,
  username: true,
  trustScore: true,
  createdAt: true,
  stats: true,
}

export default async function userRoutes(app: FastifyInstance) {
  // Own profile (auth required)
  app.get('/users/me', { preHandler: requireAuth }, async (req) => {
    const { wallet } = req.user as { wallet: string }
    return prisma.user.findUnique({
      where: { wallet },
      select: publicSelect,
    })
  })

  // Update own username (auth required)
  app.patch<{ Body: { username: string } }>(
    '/users/me',
    { preHandler: requireAuth },
    async (req, reply) => {
      const { wallet } = req.user as { wallet: string }
      const { username } = req.body

      if (!username || username.trim().length < 3 || username.trim().length > 24) {
        return reply.status(400).send({ error: 'Username must be 3–24 characters.' })
      }

      const clean = username.trim()

      const taken = await prisma.user.findFirst({ where: { username: clean, NOT: { wallet } } })
      if (taken) return reply.status(409).send({ error: 'Username already taken.' })

      return prisma.user.update({
        where: { wallet },
        data: { username: clean },
        select: publicSelect,
      })
    },
  )

  // Public profile by wallet
  app.get<{ Params: { wallet: string } }>('/users/:wallet', async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: { wallet: req.params.wallet },
      select: publicSelect,
    })
    if (!user) return reply.status(404).send({ error: 'User not found.' })
    return user
  })
}