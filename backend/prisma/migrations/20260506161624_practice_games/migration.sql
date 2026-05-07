-- AlterTable
ALTER TABLE "Game" ADD COLUMN     "creatorColor" TEXT NOT NULL DEFAULT 'white',
ADD COLUMN     "isPractice" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "timeControl" DROP NOT NULL;
