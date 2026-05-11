import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function randomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return 'CHESS-' + Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

async function main() {
  // Grab the two most recent users so the game looks real
  const users = await prisma.user.findMany({ take: 2, orderBy: { createdAt: 'desc' } })

  if (users.length < 2) {
    console.error('Need at least 2 users in the DB. Sign in with two wallets first.')
    process.exit(1)
  }

  const [white, black] = users

  const code = randomCode()
  const game = await prisma.game.create({
    data: {
      code,
      whiteWallet: white.wallet,
      blackWallet: black.wallet,
      status: 'ACTIVE',
      timeControl: 1800, // 30 minutes
      isPractice: false,
      isHosted: false,
      wager: 0,
      prizePool: 0,
    },
  })

  console.log('\n✅ Test game created')
  console.log('   Game ID  :', game.id)
  console.log('   Code     :', game.code)
  console.log('   White    :', white.wallet.slice(0, 8) + '…', white.username ?? '(no username)')
  console.log('   Black    :', black.wallet.slice(0, 8) + '…', black.username ?? '(no username)')
  console.log('\n   Open at  : <your-frontend-url>/games/' + game.id)
  console.log('   Anyone can now stake sides or add to the support pool.\n')
}

main().catch(console.error).finally(() => prisma.$disconnect())
