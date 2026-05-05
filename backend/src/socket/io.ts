import type { Server } from 'socket.io'

let _io: Server

export function setIo(io: Server) {
  _io = io
}

export function getIo(): Server {
  return _io
}