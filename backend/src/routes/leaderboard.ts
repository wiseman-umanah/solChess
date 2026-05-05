import type { FastifyInstance } from 'fastify'
import prisma from '../db/prisma.js'

export default async function leaderboardRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { limit?: string; offset?: string } }>('/leaderboard', async (req) => {
    const limit = Math.min(parseInt(req.query.limit ?? '100'), 100)
    const offset = parseInt(req.query.offset ?? '0')

    const users = await prisma.user.findMany({
      orderBy: { trustScore: 'desc' },
      skip: offset,
      take: limit,
      include: { stats: true },
    })

    return users.map((u, i) => ({
      rank: offset + i + 1,
      wallet: u.wallet,
      username: u.username,
      avatar: u.avatar,
      trustScore: u.trustScore,
      stats: u.stats,
    }))
  })
}
