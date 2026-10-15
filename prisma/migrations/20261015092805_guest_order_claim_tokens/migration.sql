-- CreateTable
CREATE TABLE "GuestOrderClaimToken" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestOrderClaimToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestOrderClaimToken_tokenHash_key" ON "GuestOrderClaimToken"("tokenHash");

-- CreateIndex
CREATE INDEX "GuestOrderClaimToken_orderId_expiresAt_idx" ON "GuestOrderClaimToken"("orderId", "expiresAt");

-- AddForeignKey
ALTER TABLE "GuestOrderClaimToken" ADD CONSTRAINT "GuestOrderClaimToken_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
