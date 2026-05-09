import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js'
import { AnchorProvider, Program, type Idl, BN } from '@coral-xyz/anchor'
import bs58 from 'bs58'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const IDL = require('./solchess.json') as Idl

// ── Program ID (must match declare_id! in lib.rs) ─────────────────────────────
export const PROGRAM_ID = new PublicKey('HCVLAPtDATPRCsGAHbFJKBmahQsjLK9QehXLna12c7NT')

// ── Seeds (must match constants.rs) ───────────────────────────────────────────
const SEED_GAME     = Buffer.from('game')
const SEED_VAULT    = Buffer.from('vault')
const SEED_STAKES   = Buffer.from('stakes')
const SEED_POSITION = Buffer.from('position')
const SEED_STATS    = Buffer.from('stats')
const SEED_PLATFORM = Buffer.from('platform')

// ── Keypair loader ────────────────────────────────────────────────────────────

function loadAuthorityKeypair(): Keypair {
  const raw = process.env.AUTHORITY_KEYPAIR
  if (!raw) {
    // Phase 2: read-only mode — dummy keypair is fine, no signing needed yet
    console.warn('[anchor] AUTHORITY_KEYPAIR not set — using ephemeral keypair (read-only)')
    return Keypair.generate()
  }
  // Support JSON array format [1,2,3,...] or base58 encoded string
  if (raw.trim().startsWith('[')) {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw) as number[]))
  }
  return Keypair.fromSecretKey(bs58.decode(raw))
}

// ── Program singleton ─────────────────────────────────────────────────────────

let _program: Program | null = null

export function getProgram(): Program {
  if (_program) return _program

  const rpcUrl = process.env.SOLANA_RPC_URL ?? 'http://127.0.0.1:8899'
  const connection = new Connection(rpcUrl, 'confirmed')
  const keypair = loadAuthorityKeypair()

  const wallet = {
    publicKey: keypair.publicKey,
    signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
      if (tx instanceof VersionedTransaction) {
        tx.sign([keypair])
      } else {
        (tx as Transaction).partialSign(keypair)
      }
      return tx
    },
    signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
      return txs.map(tx => {
        if (tx instanceof VersionedTransaction) {
          tx.sign([keypair])
        } else {
          (tx as Transaction).partialSign(keypair)
        }
        return tx
      })
    },
  }

  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  _program = new Program(IDL, provider)
  return _program
}

export function getConnection(): Connection {
  return getProgram().provider.connection
}

export function getAuthorityKeypair(): Keypair {
  // Re-parse from env each call so hot-reload in dev picks up changes
  return loadAuthorityKeypair()
}

// ── PDA derivation helpers ────────────────────────────────────────────────────

export function deriveGamePDAs(gameIdBytes: Buffer | Uint8Array) {
  const id = Buffer.from(gameIdBytes)
  const [escrow] = PublicKey.findProgramAddressSync([SEED_GAME, id], PROGRAM_ID)
  const [vault]  = PublicKey.findProgramAddressSync([SEED_VAULT, id], PROGRAM_ID)
  return { escrow, vault }
}

export function deriveStakePDAs(gameIdBytes: Buffer | Uint8Array, userPubkey?: PublicKey) {
  const id = Buffer.from(gameIdBytes)
  const [pool]       = PublicKey.findProgramAddressSync([SEED_STAKES, id], PROGRAM_ID)
  const [stakeVault] = PublicKey.findProgramAddressSync([SEED_VAULT, SEED_STAKES, id], PROGRAM_ID)
  const position = userPubkey
    ? PublicKey.findProgramAddressSync([SEED_POSITION, userPubkey.toBuffer(), id], PROGRAM_ID)[0]
    : null
  return { pool, stakeVault, position }
}

export function derivePlatformPDA(): PublicKey {
  return PublicKey.findProgramAddressSync([SEED_PLATFORM], PROGRAM_ID)[0]
}

export function deriveStatsPDA(player: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([SEED_STATS, player.toBuffer()], PROGRAM_ID)[0]
}

// ── Game ID helpers ───────────────────────────────────────────────────────────

/** Convert a backend game ID (CUID) to a 32-byte buffer for on-chain use */
export function gameIdToBytes(gameId: string): Buffer {
  const bytes = Buffer.from(gameId, 'utf8')
  const buf = Buffer.alloc(32)
  bytes.copy(buf, 0, 0, Math.min(bytes.length, 32))
  return buf
}

// ── Read helpers ──────────────────────────────────────────────────────────────

export async function fetchEscrow(gameIdBytes: Buffer | Uint8Array) {
  const { escrow } = deriveGamePDAs(gameIdBytes)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (getProgram().account as any).gameEscrow.fetchNullable(escrow)
}

export async function fetchStakePool(gameIdBytes: Buffer | Uint8Array) {
  const { pool } = deriveStakePDAs(gameIdBytes)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (getProgram().account as any).stakePool.fetchNullable(pool)
}

export async function fetchPlatformConfig() {
  const pda = derivePlatformPDA()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (getProgram().account as any).platformConfig.fetch(pda)
}

// ── Write helpers (authority signs) ──────────────────────────────────────────

type GameResultArg = { white: Record<string, never> } | { black: Record<string, never> } | { draw: Record<string, never> }

function toGameResult(winner: string): GameResultArg {
  if (winner === 'white') return { white: {} }
  if (winner === 'black') return { black: {} }
  return { draw: {} }
}

/** Settle the game escrow and pay out wagers.  Authority signs. */
export async function settleGameOnChain(
  gameId: string,
  whiteWallet: string,
  blackWallet: string,
  winner: string,
): Promise<string> {
  const program        = getProgram()
  const authority      = getAuthorityKeypair()
  const gameIdBytes    = gameIdToBytes(gameId)
  const { escrow, vault } = deriveGamePDAs(gameIdBytes)
  const platformConfig = derivePlatformPDA()
  const whiteStats     = deriveStatsPDA(new PublicKey(whiteWallet))
  const blackStats     = deriveStatsPDA(new PublicKey(blackWallet))
  const config         = await fetchPlatformConfig()
  const treasury       = config.treasury as PublicKey

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (program.methods as any)
    .settleGame(Array.from(gameIdBytes), toGameResult(winner))
    .accountsStrict({
      authority: authority.publicKey,
      gameEscrow: escrow,
      vault,
      whiteWallet: new PublicKey(whiteWallet),
      blackWallet: new PublicKey(blackWallet),
      platformConfig,
      treasury,
      whiteStats,
      blackStats,
      systemProgram: new PublicKey('11111111111111111111111111111111'),
    })
    .signers([authority])
    .rpc()
}

/** Open the spectator stake window.  Authority signs. */
export async function openStakesOnChain(gameId: string, windowSeconds: number): Promise<string> {
  const program     = getProgram()
  const authority   = getAuthorityKeypair()
  const gameIdBytes = gameIdToBytes(gameId)
  const { escrow }  = deriveGamePDAs(gameIdBytes)
  const { pool }    = deriveStakePDAs(gameIdBytes)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (program.methods as any)
    .openStakes(Array.from(gameIdBytes), windowSeconds)
    .accountsStrict({
      authority: authority.publicKey,
      gameEscrow: escrow,
      stakePool: pool,
      systemProgram: new PublicKey('11111111111111111111111111111111'),
    })
    .signers([authority])
    .rpc()
}

/** Mark the stake pool as settled so claimants can withdraw.  Authority signs. */
export async function settleStakesOnChain(gameId: string): Promise<string> {
  const program     = getProgram()
  const authority   = getAuthorityKeypair()
  const gameIdBytes = gameIdToBytes(gameId)
  const { escrow }  = deriveGamePDAs(gameIdBytes)
  const { pool }    = deriveStakePDAs(gameIdBytes)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (program.methods as any)
    .settleStakes(Array.from(gameIdBytes))
    .accountsStrict({
      authority: authority.publicKey,
      gameEscrow: escrow,
      stakePool: pool,
    })
    .signers([authority])
    .rpc()
}

/** Sweep stake vault to treasury when nobody staked the winning side.  Authority signs. */
export async function sweepStakeVaultOnChain(gameId: string): Promise<string> {
  const program        = getProgram()
  const authority      = getAuthorityKeypair()
  const gameIdBytes    = gameIdToBytes(gameId)
  const platformConfig = derivePlatformPDA()
  const { pool, stakeVault } = deriveStakePDAs(gameIdBytes)
  const config         = await fetchPlatformConfig()
  const treasury       = config.treasury as PublicKey

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (program.methods as any)
    .sweepStakeVault(Array.from(gameIdBytes))
    .accountsStrict({
      authority: authority.publicKey,
      platformConfig,
      stakePool: pool,
      vault: stakeVault,
      treasury,
      systemProgram: new PublicKey('11111111111111111111111111111111'),
    })
    .signers([authority])
    .rpc()
}

void BN // imported for external use
