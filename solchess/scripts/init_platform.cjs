/**
 * init_platform.cjs
 *
 * Initialises the PlatformConfig PDA on-chain — run ONCE after first deploy.
 * If the PDA already exists, prints the current config and exits safely.
 *
 * Usage:
 *   node scripts/init_platform.cjs                    # uses localnet
 *   node scripts/init_platform.cjs devnet             # uses devnet
 *   node scripts/init_platform.cjs mainnet-beta       # uses mainnet
 *
 * Reads AUTHORITY_KEYPAIR and TREASURY_PUBKEY from backend/.env.
 * The wallet in AUTHORITY_KEYPAIR becomes the admin, authority, and treasury
 * unless you set TREASURY_PUBKEY to a different address.
 */

const fs   = require('fs')
const path = require('path')

// ── Load backend .env ─────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '../../backend/.env')
const envText = fs.readFileSync(envPath, 'utf8')
const env = {}
for (const line of envText.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '')
}

const cluster = process.argv[2] || 'localnet'
const RPC_URLS = {
  localnet:     'http://127.0.0.1:8899',
  devnet:       'https://api.devnet.solana.com',
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
}
const RPC_URL       = RPC_URLS[cluster] || env.SOLANA_RPC_URL || RPC_URLS.localnet
const TREASURY_PUBKEY = env.TREASURY_PUBKEY
const AUTHORITY_RAW   = env.AUTHORITY_KEYPAIR

if (!AUTHORITY_RAW) {
  console.error('ERROR: AUTHORITY_KEYPAIR missing from backend/.env')
  process.exit(1)
}

// ── Load deps ─────────────────────────────────────────────────────────────────
const NM = path.join(__dirname, '../../backend/node_modules')
const { Connection, Keypair, PublicKey, SystemProgram } = require(`${NM}/@solana/web3.js`)
const anchor = require(`${NM}/@coral-xyz/anchor`)
const IDL = JSON.parse(fs.readFileSync(path.join(__dirname, '../target/idl/solchess.json'), 'utf8'))

const secretBytes  = JSON.parse(AUTHORITY_RAW)
const adminKeypair = Keypair.fromSecretKey(Uint8Array.from(secretBytes))

const PROGRAM_ID    = new PublicKey('HCVLAPtDATPRCsGAHbFJKBmahQsjLK9QehXLna12c7NT')
const [platformConfig] = PublicKey.findProgramAddressSync([Buffer.from('platform')], PROGRAM_ID)

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed')
  const wallet     = new anchor.Wallet(adminKeypair)
  const provider   = new anchor.AnchorProvider(connection, wallet, { commitment: 'confirmed' })
  anchor.setProvider(provider)
  const program   = new anchor.Program(IDL, provider)

  const treasury  = TREASURY_PUBKEY ? new PublicKey(TREASURY_PUBKEY) : adminKeypair.publicKey
  const authority = adminKeypair.publicKey

  console.log(`\nCluster          : ${cluster} (${RPC_URL})`)
  console.log(`Admin / Authority: ${authority.toBase58()}`)
  console.log(`Treasury         : ${treasury.toBase58()}`)
  console.log(`PlatformConfig   : ${platformConfig.toBase58()}\n`)

  const existing = await connection.getAccountInfo(platformConfig)
  if (existing) {
    console.log('PlatformConfig already exists — nothing to do.')
    const cfg = await program.account.platformConfig.fetch(platformConfig)
    console.log('  admin     :', cfg.admin.toBase58())
    console.log('  authority :', cfg.authority.toBase58())
    console.log('  treasury  :', cfg.treasury.toBase58())
    console.log('\nTo rotate addresses use: node scripts/update_platform.cjs [cluster]')
    return
  }

  console.log('Calling init_platform...')
  const tx = await program.methods
    .initPlatform(authority, treasury)
    .accountsStrict({
      admin: adminKeypair.publicKey,
      platformConfig,
      systemProgram: SystemProgram.programId,
    })
    .signers([adminKeypair])
    .rpc()

  console.log('✓ init_platform succeeded.')
  console.log('  Tx:', tx)

  const cfg = await program.account.platformConfig.fetch(platformConfig)
  console.log('\nOn-chain PlatformConfig:')
  console.log('  admin     :', cfg.admin.toBase58())
  console.log('  authority :', cfg.authority.toBase58())
  console.log('  treasury  :', cfg.treasury.toBase58())
}

main().catch(e => { console.error(e); process.exit(1) })
