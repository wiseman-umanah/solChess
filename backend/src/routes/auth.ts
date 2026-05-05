import type { FastifyInstance } from 'fastify'
import { randomBytes } from 'crypto'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import prisma from '../db/prisma.js'

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000  // 7 days
const ACCESS_TTL_S  = 15 * 60                    // 15 minutes

const challenges = new Map<string, { nonce: string; expiresAt: number }>()

function makeRefreshToken() {
  return randomBytes(32).toString('base64url')
}

async function issueTokens(app: FastifyInstance, wallet: string) {
  const accessToken  = app.jwt.sign({ wallet }, { expiresIn: ACCESS_TTL_S })
  const refreshToken = makeRefreshToken()

  await prisma.refreshToken.create({
    data: {
      wallet,
      token: refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  })

  return { accessToken, refreshToken, expiresIn: ACCESS_TTL_S }
}

export default async function authRoutes(app: FastifyInstance) {
  // ── Step 1: get a nonce ─────────────────────────────────────────────────
  app.post<{ Body: { wallet: string } }>('/auth/challenge', {
    schema: {
      body: { type: 'object', required: ['wallet'], properties: { wallet: { type: 'string' } } },
    },
  }, async (req) => {
    const { wallet } = req.body
    const nonce = `solchess-auth:${Date.now()}:${randomBytes(8).toString('hex')}`
    challenges.set(wallet, { nonce, expiresAt: Date.now() + 60_000 })
    return { nonce }
  })

  // ── Step 2: verify signed nonce → access + refresh tokens ───────────────
  app.post<{ Body: { wallet: string; signature: string } }>('/auth/verify', {
    schema: {
      body: {
        type: 'object',
        required: ['wallet', 'signature'],
        properties: { wallet: { type: 'string' }, signature: { type: 'string' } },
      },
    },
  }, async (req, reply) => {
    const { wallet, signature } = req.body
    const challenge = challenges.get(wallet)

    if (!challenge)            return reply.status(400).send({ error: 'No challenge found. Request one first.' })
    if (Date.now() > challenge.expiresAt) {
      challenges.delete(wallet)
      return reply.status(400).send({ error: 'Challenge expired.' })
    }

    try {
      const message    = new TextEncoder().encode(challenge.nonce)
      const sigBytes   = bs58.decode(signature)
      const pubKeyBytes = bs58.decode(wallet)
      if (!nacl.sign.detached.verify(message, sigBytes, pubKeyBytes)) {
        return reply.status(401).send({ error: 'Invalid signature.' })
      }
    } catch {
      return reply.status(401).send({ error: 'Signature verification failed.' })
    }

    challenges.delete(wallet)

    // Upsert user on first login
    await prisma.user.upsert({
      where: { wallet },
      update: {},
      create: { wallet, stats: { create: {} } },
    })

    return issueTokens(app, wallet)
  })

  // ── Refresh: exchange valid refresh token for a new access token ─────────
  app.post<{ Body: { refreshToken: string } }>('/auth/refresh', {
    schema: {
      body: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } },
    },
  }, async (req, reply) => {
    const { refreshToken } = req.body

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } })

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return reply.status(401).send({ error: 'Invalid or expired refresh token.' })
    }

    // Rotate: revoke the old one, issue fresh pair
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    })

    return issueTokens(app, stored.wallet)
  })

  // ── Logout: revoke refresh token ─────────────────────────────────────────
  app.post<{ Body: { refreshToken: string } }>('/auth/logout', {
    schema: {
      body: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } },
    },
  }, async (req, reply) => {
    const { refreshToken } = req.body

    await prisma.refreshToken.updateMany({
      where: { token: refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    })

    return reply.status(204).send()
  })
}