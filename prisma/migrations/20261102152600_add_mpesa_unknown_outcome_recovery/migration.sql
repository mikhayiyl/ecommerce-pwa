-- Add payment-attempt states and callback reconciliation metadata without changing
-- existing attempt outcomes, callback evidence, orders, stock, or refund records.
ALTER TYPE "AttemptStatus" ADD VALUE 'SUBMITTING';
ALTER TYPE "AttemptStatus" ADD VALUE 'OUTCOME_UNKNOWN';

CREATE TYPE "MpesaCallbackProcessingStatus" AS ENUM (
    'UNMATCHED',
    'PROCESSING',
    'RECONCILED',
    'NEEDS_REVIEW'
);

ALTER TABLE "PaymentAttempt"
    ADD COLUMN "checkoutRequestId" TEXT,
    ADD COLUMN "merchantRequestId" TEXT,
    ADD COLUMN "outcomeUnknownAt" TIMESTAMP(3),
    ADD COLUMN "reviewDueAt" TIMESTAMP(3);

-- Queue legacy placeholder attempts for review, but preserve their current status.
UPDATE "PaymentAttempt"
SET "reviewDueAt" = "createdAt"
WHERE "provider" = 'MPESA'
  AND "reference" LIKE 'pending-%';

CREATE UNIQUE INDEX "PaymentAttempt_checkoutRequestId_key"
    ON "PaymentAttempt"("checkoutRequestId");
CREATE INDEX "PaymentAttempt_merchantRequestId_idx"
    ON "PaymentAttempt"("merchantRequestId");
CREATE INDEX "PaymentAttempt_provider_status_reviewDueAt_idx"
    ON "PaymentAttempt"("provider", "status", "reviewDueAt");
CREATE INDEX "PaymentAttempt_orderId_provider_status_idx"
    ON "PaymentAttempt"("orderId", "provider", "status");

ALTER TABLE "MpesaCallback"
    ADD COLUMN "processingStatus" "MpesaCallbackProcessingStatus" NOT NULL DEFAULT 'UNMATCHED',
    ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "nextRetryAt" TIMESTAMP(3),
    ADD COLUMN "leaseExpiresAt" TIMESTAMP(3),
    ADD COLUMN "paymentAttemptId" TEXT;

-- Keep the existing status column and callback evidence unchanged. Unknown
-- legacy status strings remain available there and require explicit review.
UPDATE "MpesaCallback"
SET "processingStatus" = CASE
    WHEN "status" = 'RECONCILED' THEN 'RECONCILED'::"MpesaCallbackProcessingStatus"
    WHEN "status" = 'UNMATCHED' THEN 'UNMATCHED'::"MpesaCallbackProcessingStatus"
    ELSE 'NEEDS_REVIEW'::"MpesaCallbackProcessingStatus"
END;


CREATE INDEX "MpesaCallback_processingStatus_nextRetryAt_leaseExpiresAt_idx"
    ON "MpesaCallback"("processingStatus", "nextRetryAt", "leaseExpiresAt");
CREATE INDEX "MpesaCallback_paymentAttemptId_idx"
    ON "MpesaCallback"("paymentAttemptId");

ALTER TABLE "MpesaCallback"
    ADD CONSTRAINT "MpesaCallback_paymentAttemptId_fkey"
    FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
