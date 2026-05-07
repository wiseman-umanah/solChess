-- DropForeignKey
ALTER TABLE "Game" DROP CONSTRAINT "Game_whiteWallet_fkey";

-- AlterTable
ALTER TABLE "Game" ALTER COLUMN "whiteWallet" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_whiteWallet_fkey" FOREIGN KEY ("whiteWallet") REFERENCES "User"("wallet") ON DELETE SET NULL ON UPDATE CASCADE;
