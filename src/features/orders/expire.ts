import { prisma } from "@/lib/prisma";
import { releaseOrderReservation } from "@/features/orders/release";

/**
 * Cancels expired unpaid orders and releases their reservations.
 *
 * Orders with pending M-Pesa attempts are temporarily excluded because
 * the provider may have received a request whose outcome is unknown.
 * Those orders require payment reconciliation before stock is released.
 */
export async function expireStaleOrders(
  now = new Date(),
  batch = 50,
): Promise<number> {
  const stale = await prisma.order.findMany({
    where: {
      status: "PENDING",
      paymentStatus: { not: "PAID" },
      releasedAt: null,
      expiresAt: { lt: now },
      payments: {
        none: {
          provider: "MPESA",
          status: "PENDING",
        },
      },
    },
    select: { id: true },
    orderBy: { expiresAt: "asc" },
    take: batch,
  });

  let cancelled = 0;

  for (const { id } of stale) {
    const done = await prisma.$transaction(async (tx) => {
      // Recheck everything before cancellation to reduce race conditions.
      const unresolvedMpesa = await tx.paymentAttempt.findFirst({
        where: {
          orderId: id,
          provider: "MPESA",
          status: "PENDING",
        },
        select: { id: true },
      });

      if (unresolvedMpesa) return false;

      const res = await tx.order.updateMany({
        where: {
          id,
          status: "PENDING",
          paymentStatus: { not: "PAID" },
          expiresAt: { lt: now },
          releasedAt: null,
        },
        data: { status: "CANCELLED" },
      });

      if (res.count === 0) return false;

      await releaseOrderReservation(tx, id, "expired unpaid");
      return true;
    });

    if (done) cancelled += 1;
  }

  return cancelled;
}
