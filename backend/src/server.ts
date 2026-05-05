import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { Server as SocketServer } from 'socket.io'

import authRoutes from './routes/auth.js'
import userRoutes from './routes/users.js'
import gameRoutes from './routes/games.js'
import leaderboardRoutes from './routes/leaderboard.js'
import chatRoutes from './routes/chat.js'
import { registerSocketHandlers } from './socket/index.js'
import { setIo } from './socket/io.js'

const PORT = parseInt(process.env.PORT ?? '3001')
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173'

const app = Fastify({ logger: true })

await app.register(cors, { origin: CORS_ORIGIN, credentials: true })
await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'dev-secret' })

// Routes (all under /api/v1)
await app.register(authRoutes, { prefix: '/api/v1' })
await app.register(userRoutes, { prefix: '/api/v1' })
await app.register(gameRoutes, { prefix: '/api/v1' })
await app.register(leaderboardRoutes, { prefix: '/api/v1' })
await app.register(chatRoutes, { prefix: '/api/v1' })

app.get('/health', async () => ({ ok: true }))

// Start Fastify first, then attach Socket.io to the same underlying server
await app.listen({ port: PORT, host: '0.0.0.0' })

const io = new SocketServer(app.server, {
  cors: { origin: CORS_ORIGIN, credentials: true },
})

setIo(io)
registerSocketHandlers(io)

console.log(`SolChess backend running on http://0.0.0.0:${PORT}`)