import { Connection, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram } from '@solana/web3.js'
import { AnchorProvider, Program, type Idl, BN } from '@coral-xyz/anchor'
import type { AnchorWallet } from '@solana/wallet-adapter-react'
import IDL from '../anchor/solchess.json'

// ── Constants ─────────────────────────────────────────────────────────────────

export const PROGRAM_ID = new PublicKey('HCVLAPtDATPRCsGAHbFJKBmahQsjLK9QehXLna12c7NT')

const RPC_URL = (import.meta.env.VITE_SOLANA_RPC_URL as string | undefined) ?? 'http://127.0.0.1:8899'

// Seeds — must match constants.rs
const SEED_GAME     = Buffer.from('game')
const SEED_VAULT    = Buffer.from('vault')
const SEED_PLATFORM = Buffer.from('platform')
const SEED_STAKES   = Buffer.from('stakes')
const SEED_POSITION = Buffer.from('position')
const SEED_STATS    = Buffer.from('stats')

// ── Program builder ───────────────────────────────────────────────────────────

export function getProgram(wallet: AnchorWallet): Program {
  const connection = new Connection(RPC_URL, 'confirmed')
  const provider   = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  return new Program(IDL as Idl, provider)
}

// ── Game ID encoding ──────────────────────────────────────────────────────────

/** Encode a backend game ID (CUID ~25 chars) into a 32-byte buffer for on-chain use.
 *  Must match gameIdToBytes() in backend/src/anchor/client.ts exactly. */
export function gameIdToBytes(gameId: string): Buffer {
  const src = Buffer.from(gameId, 'utf8')
  const buf = Buffer.alloc(32)
  src.copy(buf, 0, 0, Math.min(src.length, 32))
  return buf
}

// ── PDA helpers ───────────────────────────────────────────────────────────────

export function derivePlatformPDA(): PublicKey {
  return PublicKey.findProgramAddressSync([SEED_PLATFORM], PROGRAM_ID)[0]
}

export function deriveGamePDAs(gameIdBytes: Buffer) {
  const [escrow] = PublicKey.findProgramAddressSync([SEED_GAME, gameIdBytes], PROGRAM_ID)
  const [vault]  = PublicKey.findProgramAddressSync([SEED_VAULT, gameIdBytes], PROGRAM_ID)
  return { escrow, vault }
}

export function deriveStakePDAs(gameIdBytes: Buffer, userPubkey?: PublicKey) {
  const [pool]       = PublicKey.findProgramAddressSync([SEED_STAKES, gameIdBytes], PROGRAM_ID)
  const [stakeVault] = PublicKey.findProgramAddressSync([SEED_VAULT, SEED_STAKES, gameIdBytes], PROGRAM_ID)
  const position = userPubkey
    ? PublicKey.findProgramAddressSync([SEED_POSITION, userPubkey.toBuffer(), gameIdBytes], PROGRAM_ID)[0]
    : null
  return { pool, stakeVault, position }
}

export function deriveStatsPDA(player: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([SEED_STATS, player.toBuffer()], PROGRAM_ID)[0]
}

// ── Instruction helpers ───────────────────────────────────────────────────────

/** Lock wager into escrow when creating a game. Called by the creator's wallet. */
export async function createEscrow(
  wallet: AnchorWallet,
  gameId: string,
  wagerSol: number,
  creatorIsWhite: boolean,
): Promise<string> {
  const program        = getProgram(wallet)
  const gameIdBytes    = gameIdToBytes(gameId)
  const wagerLamports  = new BN(Math.round(wagerSol * LAMPORTS_PER_SOL))
  const platformConfig = derivePlatformPDA()
  const { escrow, vault } = deriveGamePDAs(gameIdBytes)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tx = await (program.methods as any)
    .createGame(Array.from(gameIdBytes), wagerLamports, creatorIsWhite)
    .accountsStrict({
      creator: wallet.publicKey,
      gameEscrow: escrow,
      vault,
      platformConfig,
      systemProgram: new PublicKey('11111111111111111111111111111111'),
    })
    .rpc()

  return tx
}

/** Lock joiner's chosen wager when joining a game. Called by the joiner's wallet. */
export async function joinEscrow(
  wallet: AnchorWallet,
  gameId: string,
  joinerWagerSol: number,
): Promise<string> {
  const program        = getProgram(wallet)
  const gameIdBytes    = gameIdToBytes(gameId)
  const { escrow, vault } = deriveGamePDAs(gameIdBytes)
  const joinerWagerLamports = new BN(Math.round(joinerWagerSol * LAMPORTS_PER_SOL))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (program.methods as any)
    .joinGame(Array.from(gameIdBytes), joinerWagerLamports)
    .accountsStrict({
      joiner: wallet.publicKey,
      gameEscrow: escrow,
      vault,
      systemProgram: new PublicKey('11111111111111111111111111111111'),
    })
    .rpc()
}

/** Place a spectator stake on a side.  Called by the spectator's wallet. */
export async function placeStakeOnChain(
  wallet: AnchorWallet,
  gameId: string,
  side: 'white' | 'black' | 'draw',
  amountSol: number,
): Promise<string> {
  const program        = getProgram(wallet)
  const gameIdBytes    = gameIdToBytes(gameId)
  const { escrow }     = deriveGamePDAs(gameIdBytes)
  const { pool, stakeVault, position } = deriveStakePDAs(gameIdBytes, wallet.publicKey)
  const amountLamports = new BN(Math.round(amountSol * LAMPORTS_PER_SOL))
  const stakeSide      = side === 'white' ? { white: {} } : side === 'black' ? { black: {} } : { draw: {} }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (program.methods as any)
    .placeStake(Array.from(gameIdBytes), stakeSide, amountLamports)
    .accountsStrict({
      user: wallet.publicKey,
      gameEscrow: escrow,
      stakePool: pool,
      stakePosition: position!,
      vault: stakeVault,
      systemProgram: new PublicKey('11111111111111111111111111111111'),
    })
    .rpc()
}

/** Claim winnings from a winning stake position.  Called by the staker's wallet. */
export async function claimStakeWinnings(
  wallet: AnchorWallet,
  gameId: string,
): Promise<string> {
  const program        = getProgram(wallet)
  const gameIdBytes    = gameIdToBytes(gameId)
  const { pool, stakeVault, position } = deriveStakePDAs(gameIdBytes, wallet.publicKey)
  const platformConfigPDA = derivePlatformPDA()
  const playerStats    = deriveStatsPDA(wallet.publicKey)

  // Read treasury from on-chain platform config
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config  = await (program.account as any).platformConfig.fetch(platformConfigPDA)
  const treasury = config.treasury as PublicKey

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (program.methods as any)
    .claimStakeWinnings(Array.from(gameIdBytes))
    .accountsStrict({
      user: wallet.publicKey,
      stakePool: pool,
      stakePosition: position!,
      vault: stakeVault,
      platformConfig: platformConfigPDA,
      treasury,
      playerStats,
      systemProgram: new PublicKey('11111111111111111111111111111111'),
    })
    .rpc()
}

/** Transfer SOL directly to the game vault PDA, adding to the prize pool.
 *  The vault already exists (created by createEscrow), so a plain SOL
 *  transfer is enough — settle_game will pay out the full vault to the winner. */
export async function addToSupportPool(
  wallet: AnchorWallet,
  gameId: string,
  amountSol: number,
): Promise<string> {
  const connection  = new Connection(RPC_URL, 'confirmed')
  const provider    = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  const gameIdBytes = gameIdToBytes(gameId)
  const { vault }   = deriveGamePDAs(gameIdBytes)
  const lamports    = Math.round(amountSol * LAMPORTS_PER_SOL)

  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: wallet.publicKey, toPubkey: vault, lamports })
  )
  return provider.sendAndConfirm(tx)
}
