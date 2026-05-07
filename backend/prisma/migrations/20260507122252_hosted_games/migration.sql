-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "hostWallet" TEXT,
ADD COLUMN     "isHosted" BOOLEAN NOT NULL DEFAULT false;
