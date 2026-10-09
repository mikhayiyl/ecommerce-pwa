import { prisma } from "@/lib/prisma";
import { StockUnavailableError, reReserveOrder } from "@/features/orders/release";
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
  const attempt = await prisma.paymentAttempt.findUnique({ where: { reference: input.reference } });
  if (!attempt) return { ok: false, reason: "Unknown payment reference" };
  if (attempt.amountCents !== input.amountCents || attempt.currency.toUpperCase() !== input.currency.toUpperCase()) {
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
        data: { status: "SUCCESS", receipt, failureReason: null, resolvedAt: new Date() },
      });
      if (claimed.count === 0) return { changed: false, needsRefund: false }; // already settled

      const order = await tx.order.findUniqueOrThrow({ where: { id: attempt.orderId } });
      const paid = {
        status: "PAID" as const,
        paymentStatus: "PAID" as const,
        paymentProvider: attempt.provider,
        paymentReceipt: receipt,
        paidAt: new Date(),
      };

      if (order.status === "PENDING") {
        await tx.order.update({ where: { id: order.id }, data: paid });
        return { changed: true, needsRefund: false };
      }
      if (order.status === "CANCELLED" && order.paymentStatus !== "PAID") {
        // The order expired while the customer was paying: take the stock back if it is still there.
        await reReserveOrder(tx, order.id);
        await tx.order.update({ where: { id: order.id }, data: paid });
        return { changed: true, needsRefund: false };
      }
      // Already paid (a second payment) or refunded/shipped: keep the record and flag it for a refund.
      return { changed: false, needsRefund: true };
    });
  } catch (e) {
    if (!(e instanceof StockUnavailableError)) throw e;
    // Money arrived but the goods are gone: record the payment, leave the order cancelled, flag a refund.
    await prisma.$transaction([
      prisma.paymentAttempt.updateMany({
        where: { id: attempt.id },
        data: { status: "SUCCESS", receipt, resolvedAt: new Date(), failureReason: "Paid after expiry and out of stock: refund required" },
      }),
      prisma.order.update({
        where: { id: attempt.orderId },
        data: { paymentStatus: "PAID", paymentProvider: attempt.provider, paymentReceipt: receipt, paidAt: new Date() },
      }),
    ]);
    console.error(`REFUND REQUIRED: order ${attempt.orderId} was paid (${input.reference}) after it expired and stock ran out`);
    return { ok: true, orderId: attempt.orderId, changed: false, needsRefund: true };
  }

  if (outcome.needsRefund) {
    console.error(`REFUND REQUIRED: extra payment ${input.reference} for order ${attempt.orderId}`);
  }
  if (outcome.changed) await sendOrderConfirmation(attempt.orderId);
  return { ok: true, orderId: attempt.orderId, ...outcome };
}

/** Records a failed or cancelled attempt so the customer can try again. Safe to call repeatedly. */
export async function settleAttemptFailure(reference: string, reason: string): Promise<void> {
  const attempt = await prisma.paymentAttempt.findUnique({ where: { reference } });
  if (!attempt) return;
  await prisma.$transaction(async (tx) => {
    const res = await tx.paymentAttempt.updateMany({
      where: { id: attempt.id, status: "PENDING" },
      data: { status: "FAILED", failureReason: reason.slice(0, 200), resolvedAt: new Date() },
    });
    if (res.count > 0) {
      await tx.order.updateMany({
        where: { id: attempt.orderId, status: "PENDING", paymentStatus: "UNPAID" },
        data: { paymentStatus: "FAILED" },
      });
    }
  });
}
