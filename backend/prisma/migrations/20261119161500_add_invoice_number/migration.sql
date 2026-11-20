-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN "invoiceNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "deliveries_invoiceNumber_key" ON "deliveries"("invoiceNumber");
