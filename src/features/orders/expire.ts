import { prisma } from "@/lib/prisma";
import { releaseOrderReservation } from "@/features/orders/release";

/**
 * Cancels unpaid orders whose hold has run out and gives their stock and coupon use back.
 * Run it on a schedule (see /api/cron/expire-orders). Returns how many orders were cancelled.
 */
export async function expireStaleOrders(now = new Date(), batch = 50): Promise<number> {
  const stale = await prisma.order.findMany({
    where: { status: "PENDING", releasedAt: null, expiresAt: { lt: now } },
    select: { id: true },
    orderBy: { expiresAt: "asc" },
    take: batch,
  });

  let cancelled = 0;
  for (const { id } of stale) {
    const done = await prisma.$transaction(async (tx) => {
      // Re-checks the conditions so a payment that just extended the hold or completed wins the race.
      const res = await tx.order.updateMany({
        where: { id, status: "PENDING", paymentStatus: { not: "PAID" }, expiresAt: { lt: now } },
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
