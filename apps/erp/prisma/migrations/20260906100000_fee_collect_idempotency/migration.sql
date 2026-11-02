-- AlterTable
ALTER TABLE "FeeInvoiceLine" ADD COLUMN "discount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "FeeInvoiceLine" ADD COLUMN "fine" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "FeeInvoiceLine" ADD COLUMN "dueDate" DATE;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "idempotencyKey" TEXT;
ALTER TABLE "Payment" ADD COLUMN "lineId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
