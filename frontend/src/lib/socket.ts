import { io } from 'socket.io-client'

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

// Single socket instance shared across the app — starts disconnected
export const socket = io(BASE, { autoConnect: false, transports: ['websocket'] })