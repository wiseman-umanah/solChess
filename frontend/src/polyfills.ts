import { Buffer } from 'buffer'

const globalScope = globalThis as any

if (!globalScope.Buffer) {
  globalScope.Buffer = Buffer
}

if (!globalScope.global) {
  globalScope.global = globalScope
}
