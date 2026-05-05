import type { FastifyInstance } from 'fastify'
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import prisma from '../db/prisma.js'

const challenges = new Map<string, { nonce: string; expiresAt: number }>()

export default async function authRoutes(app: FastifyInstance) {
  // Step 1: request a nonce to sign
  app.post<{ Body: { wallet: string } }>('/auth/challenge', {
    schema: {
      body: { type: 'object', required: ['wallet'], properties: { wallet: { type: 'string' } } },
    },
  }, async (req, reply) => {
    const { wallet } = req.body
    const nonce = `solchess-auth:${Date.now()}:${Math.random().toString(36).slice(2)}`
    challenges.set(wallet, { nonce, expiresAt: Date.now() + 60_000 })
    return { nonce }
  })

  // Step 2: verify signed nonce, return JWT
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

    if (!challenge) return reply.status(400).send({ error: 'No challenge found. Request one first.' })
    if (Date.now() > challenge.expiresAt) {
      challenges.delete(wallet)
      return reply.status(400).send({ error: 'Challenge expired.' })
    }

    try {
      const message = new TextEncoder().encode(challenge.nonce)
      const sigBytes = bs58.decode(signature)
      const pubKeyBytes = bs58.decode(wallet)
      const valid = nacl.sign.detached.verify(message, sigBytes, pubKeyBytes)
      if (!valid) return reply.status(401).send({ error: 'Invalid signature.' })
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

    const token = app.jwt.sign({ wallet }, { expiresIn: '7d' })
    return { token }
  })
}
