import type { FastifyInstance } from 'fastify'
import { requireAuth } from '../middleware/auth.js'
import prisma from '../db/prisma.js'

export default async function userRoutes(app: FastifyInstance) {
  // Get any user's public profile
  app.get<{ Params: { wallet: string } }>('/users/:wallet', async (req, reply) => {
    const user = await prisma.user.findUnique({
      where: { wallet: req.params.wallet },
      include: { stats: true },
    })
    if (!user) return reply.status(404).send({ error: 'User not found' })
    return user
  })

  // Update own profile (auth required)
  app.patch<{ Body: { username?: string; avatar?: string } }>(
    '/users/me',
    { preHandler: requireAuth },
    async (req, reply) => {
      const { wallet } = req.user as { wallet: string }
      const { username, avatar } = req.body

      if (username !== undefined) {
        const taken = await prisma.user.findFirst({ where: { username, NOT: { wallet } } })
        if (taken) return reply.status(409).send({ error: 'Username already taken' })
      }

      const updated = await prisma.user.update({
        where: { wallet },
        data: { ...(username !== undefined && { username }), ...(avatar !== undefined && { avatar }) },
        include: { stats: true },
      })
      return updated
    },
  )
}
