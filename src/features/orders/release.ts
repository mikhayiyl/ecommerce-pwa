import type { Prisma } from "@/generated/prisma/client";

type Tx = Prisma.TransactionClient;

export class StockUnavailableError extends Error {}

/**
 * Gives an order's reserved stock and coupon use back. Safe to call more than once:
 * `releasedAt` is claimed atomically, so concurrent callers (admin, expiry sweep) release only once.
 * Returns true when this call did the release.
 */
export async function releaseOrderReservation(tx: Tx, orderId: string, reason: string): Promise<boolean> {
  const claimed = await tx.order.updateMany({
    where: { id: orderId, releasedAt: null },
    data: { releasedAt: new Date() },
  });
  if (claimed.count === 0) return false;

  const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return false;

  // Fixed order avoids deadlocks between concurrent releases and checkouts.
  const items = [...order.items].sort((a, b) => (a.productId ?? "").localeCompare(b.productId ?? ""));
  for (const item of items) {
    if (!item.productId) continue;
    await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    await tx.stockMovement.create({
      data: { productId: item.productId, delta: item.quantity, reason: `Order #${order.number} ${reason}` },
    });
  }
  if (order.couponCode) {
    await tx.discount.updateMany({
      where: { code: order.couponCode, usedCount: { gt: 0 } },
      data: { usedCount: { decrement: 1 } },
    });
  }
  return true;
}

/**
 * Takes stock back for an order whose reservation was released (a payment that arrived after the
 * order expired). Throws StockUnavailableError, rolling the surrounding transaction back, if any item
 * has sold out in the meantime.
 */
export async function reReserveOrder(tx: Tx, orderId: string): Promise<void> {
  const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order || order.releasedAt === null) return;

  const items = [...order.items].sort((a, b) => (a.productId ?? "").localeCompare(b.productId ?? ""));
  for (const item of items) {
    if (!item.productId) throw new StockUnavailableError("A product on this order no longer exists");
    const res = await tx.product.updateMany({
      where: { id: item.productId, stock: { gte: item.quantity } },
      data: { stock: { decrement: item.quantity } },
    });
    if (res.count === 0) throw new StockUnavailableError(`Not enough stock for "${item.name}"`);
    await tx.stockMovement.create({
      data: { productId: item.productId, delta: -item.quantity, reason: `Order #${order.number} paid after expiry` },
    });
  }
  if (order.couponCode) {
    await tx.discount.updateMany({ where: { code: order.couponCode }, data: { usedCount: { increment: 1 } } });
  }
  await tx.order.update({ where: { id: orderId }, data: { releasedAt: null } });
}

/** How long an unpaid order keeps its stock reserved. */
export const ORDER_HOLD_MINUTES = 30;
/** Payment in flight (card page open, M-Pesa prompt sent) extends the hold to at least this long. */
export const PAYMENT_GRACE_MINUTES = 15;

export function holdUntil(now: Date, minutes = ORDER_HOLD_MINUTES): Date {
  return new Date(now.getTime() + minutes * 60_000);
}
