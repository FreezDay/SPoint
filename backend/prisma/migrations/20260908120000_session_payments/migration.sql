-- Per-session payments: a closed (COMPLETED) session with a value posts to the
-- earnings ledger (ServiceRecord). The session keeps the amount/payment method
-- and a snapshot of the keep rate, plus the link to its ServiceRecord.

-- AlterTable
ALTER TABLE "TattooSession" ADD COLUMN     "amount" DECIMAL(10,2),
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "keepPercent" DECIMAL(5,2),
ADD COLUMN     "serviceRecordId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TattooSession_serviceRecordId_key" ON "TattooSession"("serviceRecordId");

-- AddForeignKey
ALTER TABLE "TattooSession" ADD CONSTRAINT "TattooSession_serviceRecordId_fkey" FOREIGN KEY ("serviceRecordId") REFERENCES "ServiceRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
