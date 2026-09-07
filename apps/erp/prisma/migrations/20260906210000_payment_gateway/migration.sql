-- CreateTable
CREATE TABLE "PaymentMerchant" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "keyId" TEXT NOT NULL,
    "keySecretEnc" TEXT NOT NULL,
    "webhookSecretEnc" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "feeTypeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentMerchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GatewayOrder" (
    "id" TEXT NOT NULL,
    "campusId" TEXT NOT NULL,
    "merchantId" TEXT,
    "provider" TEXT NOT NULL,
    "providerOrderId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "purpose" TEXT NOT NULL,
    "invoiceId" TEXT,
    "enrollmentId" TEXT,
    "applicationId" TEXT,
    "studentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GatewayOrder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentMerchant_campusId_provider_idx" ON "PaymentMerchant"("campusId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "GatewayOrder_providerOrderId_key" ON "GatewayOrder"("providerOrderId");

-- CreateIndex
CREATE INDEX "GatewayOrder_campusId_status_idx" ON "GatewayOrder"("campusId", "status");

-- AddForeignKey
ALTER TABLE "PaymentMerchant" ADD CONSTRAINT "PaymentMerchant_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMerchant" ADD CONSTRAINT "PaymentMerchant_feeTypeId_fkey" FOREIGN KEY ("feeTypeId") REFERENCES "FeeType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatewayOrder" ADD CONSTRAINT "GatewayOrder_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "Campus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GatewayOrder" ADD CONSTRAINT "GatewayOrder_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "PaymentMerchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
