import { prisma } from "@/lib/prisma";
import {
  StockUnavailableError,
  reReserveOrder,
} from "@/features/orders/release";
import { sendOrderConfirmation } from "@/features/orders/email";

export type SettleResult =
  | { ok: true; orderId: string; changed: boolean; needsRefund: boolean }
  | { ok: false; reason: string };

/**
 * Records a successful charge. Called from webhooks and from the status poll, so it must be idempotent:
 * the attempt is claimed with a conditional update and a repeat call changes nothing.
 *
 * `amountCents`/`currency` are what the PROVIDER reports; they must equal what we asked it to charge.
 */
export async function settleAttemptSuccess(input: {
  reference: string;
  amountCents: number;
  currency: string;
  receipt?: string | null;
}): Promise<SettleResult> {
  const attempt = await prisma.paymentAttempt.findUnique({
    where: { reference: input.reference },
  });
  if (!attempt) return { ok: false, reason: "Unknown payment reference" };
  if (
    attempt.amountCents !== input.amountCents ||
    attempt.currency.toUpperCase() !== input.currency.toUpperCase()
  ) {
    return {
      ok: false,
      reason: `Amount mismatch for ${input.reference}: expected ${attempt.amountCents} ${attempt.currency}, got ${input.amountCents} ${input.currency}`,
    };
  }
  const receipt = input.receipt ?? null;

  let outcome: { changed: boolean; needsRefund: boolean };
  try {
    outcome = await prisma.$transaction(async (tx) => {
      const claimed = await tx.paymentAttempt.updateMany({
        where: { id: attempt.id, status: { in: ["PENDING", "FAILED"] } },
        data: {
          status: "SUCCESS",
          receipt,
          failureReason: null,
          resolvedAt: new Date(),
        },
      });
      if (claimed.count === 0) return { changed: false, needsRefund: false }; // already settled

      const paid = {
        status: "PAID" as const,
        paymentStatus: "PAID" as const,
        paymentProvider: attempt.provider,
        paymentReceipt: receipt,
        paidAt: new Date(),
      };

      // Atomically claim a pending order. Only one attempt can change
      // this order from PENDING to PAID.
      const pendingClaim = await tx.order.updateMany({
        where: {
          id: attempt.orderId,
          status: "PENDING",
          paymentStatus: { not: "PAID" },
        },
        data: paid,
      });

      if (pendingClaim.count > 0) {
        return { changed: true, needsRefund: false };
      }

      // Re-read the order because another transaction may have changed it.
      const order = await tx.order.findUniqueOrThrow({
        where: { id: attempt.orderId },
      });

      // A cancelled order may have had its stock reservation released.
      // Claim the cancelled order atomically before re-reserving stock.
      if (order.status === "CANCELLED" && order.paymentStatus !== "PAID") {
        const cancelledClaim = await tx.order.updateMany({
          where: {
            id: order.id,
            status: "CANCELLED",
            paymentStatus: { not: "PAID" },
          },
          data: paid,
        });

        if (cancelledClaim.count > 0) {
          await reReserveOrder(tx, order.id);
          return { changed: true, needsRefund: false };
        }
      }
      // Another attempt paid the order, or the order is no longer payable.
      // Persist the refund warning in the same transaction as the successful charge.
      await tx.paymentAttempt.updateMany({
        where: {
          id: attempt.id,
          status: "SUCCESS",
        },

        data: {
          refundStatus: "PENDING",
          refundReason: "Order was already paid or is no longer payable",
          failureReason:
            "Refund required: order was already paid or is no longer payable",
        },
      });

      return { changed: false, needsRefund: true };
    });
  } catch (e) {
    if (!(e instanceof StockUnavailableError)) throw e;

    // The original transaction rolled back. Record the late payment
    // only if this attempt has not already been resolved.
    const fallback = await prisma.$transaction(async (tx) => {
      const claimed = await tx.paymentAttempt.updateMany({
        where: {
          id: attempt.id,
          status: { in: ["PENDING", "FAILED"] },
        },
        data: {
          status: "SUCCESS",
          receipt,
          resolvedAt: new Date(),
          failureReason: "Paid after expiry and out of stock: refund required",
          refundStatus: "PENDING",
          refundReason: "Paid after expiry, but stock is unavailable",
        },
      });

      if (claimed.count === 0) {
        return { recorded: false };
      }

      // Never overwrite a payment already recorded on an order
      // that another callback has resolved.
      await tx.order.updateMany({
        where: {
          id: attempt.orderId,
          status: "CANCELLED",
          paymentStatus: { not: "PAID" },
        },
        data: {
          paymentStatus: "PAID",
          paymentProvider: attempt.provider,
          paymentReceipt: receipt,
          paidAt: new Date(),
        },
      });

      return { recorded: true };
    });

    if (fallback.recorded) {
      console.error(
        `REFUND REQUIRED: order ${attempt.orderId} was paid (${input.reference}) after it expired and stock ran out`,
      );
    }

    return {
      ok: true,
      orderId: attempt.orderId,
      changed: false,
      needsRefund: fallback.recorded,
    };
  }

  if (outcome.needsRefund) {
    console.error(
      `REFUND REQUIRED: extra payment ${input.reference} for order ${attempt.orderId}`,
    );
  }
  if (outcome.changed) await sendOrderConfirmation(attempt.orderId);
  return { ok: true, orderId: attempt.orderId, ...outcome };
}

/** Records a failed or cancelled attempt so the customer can try again. Safe to call repeatedly. */
export async function settleAttemptFailure(
  reference: string,
  reason: string,
): Promise<void> {
  const attempt = await prisma.paymentAttempt.findUnique({
    where: { reference },
  });
  if (!attempt) return;
  await prisma.$transaction(async (tx) => {
    const res = await tx.paymentAttempt.updateMany({
      where: { id: attempt.id, status: "PENDING" },
      data: {
        status: "FAILED",
        failureReason: reason.slice(0, 200),
        resolvedAt: new Date(),
      },
    });
    if (res.count > 0) {
      await tx.order.updateMany({
        where: {
          id: attempt.orderId,
          status: "PENDING",
          paymentStatus: "UNPAID",
        },
        data: { paymentStatus: "FAILED" },
      });
    }
  });
}
