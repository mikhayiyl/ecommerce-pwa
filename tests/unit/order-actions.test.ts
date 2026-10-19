import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  revalidatePath: vi.fn(),
  releaseOrderReservation: vi.fn(),
  prisma: {
    $transaction: vi.fn(),
  },
  tx: {
    order: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/security/guards", () => ({
  requireAdmin: mocks.requireAdmin,
}));

vi.mock("@/features/orders/release", () => ({
  releaseOrderReservation: mocks.releaseOrderReservation,
}));

import { updateOrderStatusAction } from "@/actions/orders";

describe("updateOrderStatusAction", () => {
  const order = {
    id: "order-123",
    status: "PENDING",
    paymentStatus: "UNPAID",
    releasedAt: null,
    paidAt: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireAdmin.mockResolvedValue(undefined);
    mocks.tx.order.findUnique.mockResolvedValue({ ...order });
    mocks.tx.order.updateMany.mockResolvedValue({ count: 1 });
    mocks.releaseOrderReservation.mockResolvedValue(true);

    mocks.prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mocks.tx) => Promise<unknown>) =>
        callback(mocks.tx),
    );
  });

  it("updates an order and releases its reservation when cancelled", async () => {
    const formData = new FormData();
    formData.set("status", "CANCELLED");

    const result = await updateOrderStatusAction("order-123", {}, formData);

    expect(result).toEqual({ success: "Order updated" });

    expect(mocks.tx.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: "order-123",
        status: "PENDING",
        paymentStatus: "UNPAID",
        releasedAt: null,
      },
      data: {
        status: "CANCELLED",
        paymentStatus: "UNPAID",
      },
    });

    expect(mocks.releaseOrderReservation).toHaveBeenCalledWith(
      mocks.tx,
      "order-123",
      "cancelled",
    );

    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin", "layout");
  });

  it("does not release stock if the order changed before the update", async () => {
    const formData = new FormData();
    formData.set("status", "CANCELLED");

    mocks.tx.order.updateMany.mockResolvedValue({ count: 0 });

    const result = await updateOrderStatusAction("order-123", {}, formData);

    expect(result).toEqual({
      error: "Order changed while you were updating it. Refresh and try again.",
    });

    expect(mocks.releaseOrderReservation).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects an invalid status", async () => {
    const formData = new FormData();
    formData.set("status", "NOT_A_STATUS");

    const result = await updateOrderStatusAction("order-123", {}, formData);

    expect(result).toEqual({ error: "Invalid status" });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("rejects a transition that is not allowed", async () => {
    const formData = new FormData();
    formData.set("status", "SHIPPED");

    const result = await updateOrderStatusAction("order-123", {}, formData);

    expect(result).toEqual({
      error: "Cannot change from PENDING to SHIPPED",
    });

    expect(mocks.tx.order.updateMany).not.toHaveBeenCalled();
    expect(mocks.releaseOrderReservation).not.toHaveBeenCalled();
  });

  it("rejects an order that does not exist", async () => {
    const formData = new FormData();
    formData.set("status", "CANCELLED");

    mocks.tx.order.findUnique.mockResolvedValue(null);

    const result = await updateOrderStatusAction("order-123", {}, formData);

    expect(result).toEqual({ error: "Order not found" });
    expect(mocks.tx.order.updateMany).not.toHaveBeenCalled();
    expect(mocks.releaseOrderReservation).not.toHaveBeenCalled();
  });
});
