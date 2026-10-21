import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  prisma: {
    order: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  tx: {
    order: {
      updateMany: vi.fn(),
    },
    paymentAttempt: {
      findFirst: vi.fn(),
    },
  },
  releaseOrderReservation: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/features/orders/release", () => ({
  releaseOrderReservation: mocks.releaseOrderReservation,
}));

import { expireStaleOrders } from "@/features/orders/expire";

describe("expireStaleOrders", () => {
  const now = new Date("2026-10-19T12:00:00.000Z");

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.prisma.order.findMany.mockResolvedValue([{ id: "order-123" }]);
    mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });
    mocks.releaseOrderReservation.mockResolvedValue(true);
    mocks.tx.paymentAttempt.findFirst.mockResolvedValue(null);

    mocks.prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mocks.tx) => Promise<unknown>) =>
        callback(mocks.tx),
    );
  });

  it("cancels stale unpaid orders and releases their reservations", async () => {
    const result = await expireStaleOrders(now);

    expect(result).toBe(1);

    expect(mocks.tx.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: "order-123",
        status: "PENDING",
        paymentStatus: { not: "PAID" },
        expiresAt: { lt: now },
        releasedAt: null,
      },
      data: { status: "CANCELLED" },
    });

    expect(mocks.releaseOrderReservation).toHaveBeenCalledWith(
      mocks.tx,
      "order-123",
      "expired unpaid",
    );

    expect(mocks.tx.paymentAttempt.findFirst).toHaveBeenCalledWith({
      where: {
        orderId: "order-123",
        provider: "MPESA",
        status: "PENDING",
      },
      select: { id: true },
    });
  });

  it("does not release stock when the conditional cancellation fails", async () => {
    mocks.tx.order.updateMany.mockResolvedValue({ count: 0 });

    const result = await expireStaleOrders(now);

    expect(result).toBe(0);
    expect(mocks.releaseOrderReservation).not.toHaveBeenCalled();
  });

  it("returns zero when no stale orders are found", async () => {
    mocks.prisma.order.findMany.mockResolvedValue([]);

    const result = await expireStaleOrders(now);

    expect(result).toBe(0);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("does not cancel or release stock when an M-Pesa attempt is pending", async () => {
    mocks.tx.paymentAttempt.findFirst.mockResolvedValue({
      id: "attempt-123",
    });

    const result = await expireStaleOrders(now);

    expect(result).toBe(0);
    expect(mocks.tx.order.updateMany).not.toHaveBeenCalled();
    expect(mocks.releaseOrderReservation).not.toHaveBeenCalled();
  });
});
