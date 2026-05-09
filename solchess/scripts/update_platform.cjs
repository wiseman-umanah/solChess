/**
 * update_platform.cjs
 *
 * Rotates the authority and/or treasury on an already-initialised PlatformConfig.
 * Only the original admin keypair (from AUTHORITY_KEYPAIR in backend/.env) can call this.
 *
 * Usage:
 *   node scripts/update_platform.cjs                  # uses localnet
 *   node scripts/update_platform.cjs devnet           # uses devnet
 *   node scripts/update_platform.cjs mainnet-beta     # uses mainnet
 *
 * Reads new values from backend/.env:
 *   AUTHORITY_KEYPAIR  — signs the tx (must be the admin)
 *   TREASURY_PUBKEY    — new treasury address (set to same as authority if you want one wallet)
 */

const fs   = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '../../backend/.env')
const envText = fs.readFileSync(envPath, 'utf8')
const env = {}
for (const line of envText.split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, '')
}

const cluster = process.argv[2] || 'localnet'
const RPC_URLS = {
  localnet:       'http://127.0.0.1:8899',
  devnet:         'https://api.devnet.solana.com',
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
}
const RPC_URL         = RPC_URLS[cluster] || env.SOLANA_RPC_URL || RPC_URLS.localnet
const TREASURY_PUBKEY = env.TREASURY_PUBKEY
const AUTHORITY_RAW   = env.AUTHORITY_KEYPAIR

if (!AUTHORITY_RAW) {
  console.error('ERROR: AUTHORITY_KEYPAIR missing from backend/.env')
  process.exit(1)
}

const NM = path.join(__dirname, '../../backend/node_modules')
const { Connection, Keypair, PublicKey } = require(`${NM}/@solana/web3.js`)
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
  const program = new anchor.Program(IDL, provider)

  const newAuthority = adminKeypair.publicKey
  const newTreasury  = TREASURY_PUBKEY ? new PublicKey(TREASURY_PUBKEY) : adminKeypair.publicKey

  console.log(`\nCluster      : ${cluster} (${RPC_URL})`)
  console.log(`New authority: ${newAuthority.toBase58()}`)
  console.log(`New treasury : ${newTreasury.toBase58()}\n`)

  const tx = await program.methods
    .updatePlatform(newAuthority, newTreasury)
    .accountsStrict({ admin: adminKeypair.publicKey, platformConfig })
    .signers([adminKeypair])
    .rpc()

  console.log('✓ update_platform succeeded.')
  console.log('  Tx:', tx)

  const cfg = await program.account.platformConfig.fetch(platformConfig)
  console.log('\nUpdated PlatformConfig:')
  console.log('  admin     :', cfg.admin.toBase58())
  console.log('  authority :', cfg.authority.toBase58())
  console.log('  treasury  :', cfg.treasury.toBase58())
}

main().catch(e => { console.error(e); process.exit(1) })
