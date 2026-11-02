-- CreateTable
CREATE TABLE "MpesaCallback" (
    "id" TEXT NOT NULL,
    "checkoutRequestId" TEXT NOT NULL,
    "merchantRequestId" TEXT,
    "resultCode" INTEGER NOT NULL,
    "resultDesc" TEXT NOT NULL,
    "amountCents" INTEGER,
    "receipt" TEXT,
    "rawPayload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNMATCHED',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reconciledAt" TIMESTAMP(3),

    CONSTRAINT "MpesaCallback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MpesaCallback_status_receivedAt_idx" ON "MpesaCallback"("status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaCallback_checkoutRequestId_resultCode_key" ON "MpesaCallback"("checkoutRequestId", "resultCode");
