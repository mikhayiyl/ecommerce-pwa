import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  revalidatePath: vi.fn(),
  prisma: {
    paymentAttempt: {
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

import { markRefundProcessedAction } from "@/actions/refunds";

describe("markRefundProcessedAction", () => {
  const paymentAttemptId = "clh1234567890123456789012";
  const attempt = {
    id: paymentAttemptId,
    orderId: "order-123",
    refundStatus: "PENDING",
  };

  function confirmedForm() {
    const formData = new FormData();
    formData.set("confirm", "on");
    return formData;
  }

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.requireAdmin.mockResolvedValue({
      id: "admin-123",
      role: "ADMIN",
    });
    mocks.prisma.paymentAttempt.findUnique.mockResolvedValue({ ...attempt });
    mocks.prisma.paymentAttempt.updateMany.mockResolvedValue({ count: 1 });
  });

  it("requires explicit confirmation", async () => {
    const result = await markRefundProcessedAction(
      paymentAttemptId,
      {},
      new FormData(),
    );

    expect(result).toEqual({
      error: "Confirm that the refund was processed with the payment provider.",
    });
    expect(mocks.prisma.paymentAttempt.findUnique).not.toHaveBeenCalled();
    expect(mocks.prisma.paymentAttempt.updateMany).not.toHaveBeenCalled();
  });

  it("rejects an invalid payment attempt ID", async () => {
    const result = await markRefundProcessedAction(
      "invalid-id",
      {},
      confirmedForm(),
    );

    expect(result).toEqual({ error: "Invalid payment attempt" });
    expect(mocks.prisma.paymentAttempt.findUnique).not.toHaveBeenCalled();
  });

  it("rejects a payment attempt that does not exist", async () => {
    mocks.prisma.paymentAttempt.findUnique.mockResolvedValue(null);

    const result = await markRefundProcessedAction(
      paymentAttemptId,
      {},
      confirmedForm(),
    );

    expect(result).toEqual({ error: "Payment attempt not found" });
    expect(mocks.prisma.paymentAttempt.updateMany).not.toHaveBeenCalled();
  });

  it("does not update a refund that is no longer pending", async () => {
    mocks.prisma.paymentAttempt.findUnique.mockResolvedValue({
      ...attempt,
      refundStatus: "REFUNDED",
    });

    const result = await markRefundProcessedAction(
      paymentAttemptId,
      {},
      confirmedForm(),
    );

    expect(result.error).toContain("no longer pending");
    expect(mocks.prisma.paymentAttempt.updateMany).not.toHaveBeenCalled();
  });

  it("marks a pending refund as refunded and revalidates admin pages", async () => {
    const result = await markRefundProcessedAction(
      paymentAttemptId,
      {},
      confirmedForm(),
    );

    expect(result).toEqual({ success: "Refund marked as processed." });
    expect(mocks.prisma.paymentAttempt.updateMany).toHaveBeenCalledWith({
      where: {
        id: paymentAttemptId,
        refundStatus: "PENDING",
      },

      data: {
        refundStatus: "REFUNDED",
        refundedAt: expect.any(Date),
        refundedById: "admin-123",
      },
    });

    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/admin/orders/order-123",
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/admin/orders");
  });

  it("rejects a competing request if another request already updated the refund", async () => {
    mocks.prisma.paymentAttempt.updateMany.mockResolvedValue({ count: 0 });

    const result = await markRefundProcessedAction(
      paymentAttemptId,
      {},
      confirmedForm(),
    );

    expect(result).toEqual({
      error: "This refund was already updated. Refresh the page.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
