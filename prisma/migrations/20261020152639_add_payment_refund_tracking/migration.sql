-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'REFUNDED');

-- AlterTable
ALTER TABLE "PaymentAttempt" ADD COLUMN     "refundReason" TEXT,
ADD COLUMN     "refundStatus" "RefundStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "refundedAt" TIMESTAMP(3);
