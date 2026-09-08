-- The ledger record is owned by its session: when a session is deleted
-- (session/project/client removal) its earning goes with it. The link moves
-- from TattooSession.serviceRecordId to ServiceRecord.sessionId.

-- DropForeignKey
ALTER TABLE "TattooSession" DROP CONSTRAINT IF EXISTS "TattooSession_serviceRecordId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "TattooSession_serviceRecordId_key";

-- AlterTable
ALTER TABLE "TattooSession" DROP COLUMN IF EXISTS "serviceRecordId";

-- AlterTable
ALTER TABLE "ServiceRecord" ADD COLUMN     "sessionId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ServiceRecord_sessionId_key" ON "ServiceRecord"("sessionId");

-- AddForeignKey
ALTER TABLE "ServiceRecord" ADD CONSTRAINT "ServiceRecord_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TattooSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
