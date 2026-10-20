import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, sendOrderConfirmationMock, reReserveOrderMock } =
  vi.hoisted(() => ({
    prismaMock: {
      paymentAttempt: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
      order: {
        update: vi.fn(),
        updateMany: vi.fn(),
        findUniqueOrThrow: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    sendOrderConfirmationMock: vi.fn(),
    reReserveOrderMock: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/features/orders/email", () => ({
  sendOrderConfirmation: sendOrderConfirmationMock,
}));
vi.mock("@/features/orders/release", () => ({
  StockUnavailableError: class StockUnavailableError extends Error {},
  reReserveOrder: reReserveOrderMock,
}));

import { StockUnavailableError } from "@/features/orders/release";
import {
  settleAttemptFailure,
  settleAttemptSuccess,
} from "@/features/payments/settle";

const attempt = {
  id: "attempt-1",
  orderId: "order-1",
  provider: "PAYSTACK",
  reference: "ref-1",
  amountCents: 5000,
  currency: "usd",
  status: "PENDING",
};

const pendingOrder = {
  id: "order-1",
  status: "PENDING",
  paymentStatus: "UNPAID",
};

function transactionClient() {
  return {
    paymentAttempt: { updateMany: prismaMock.paymentAttempt.updateMany },
    order: {
      updateMany: prismaMock.order.updateMany,
      findUniqueOrThrow: prismaMock.order.findUniqueOrThrow,
    },
  };
}

describe("settleAttemptSuccess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.paymentAttempt.findUnique.mockResolvedValue(attempt);
    prismaMock.paymentAttempt.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.order.update.mockResolvedValue({});
    prismaMock.order.findUniqueOrThrow.mockResolvedValue(pendingOrder);

    prismaMock.$transaction.mockImplementation(async (operation: unknown) => {
      if (typeof operation === "function") {
        return operation(transactionClient());
      }

      throw new Error("Unexpected transaction operation in this test");
    });

    sendOrderConfirmationMock.mockResolvedValue(undefined);
    reReserveOrderMock.mockResolvedValue(undefined);
  });

  it("atomically claims a pending order for the successful payment", async () => {
    const result = await settleAttemptSuccess({
      reference: "ref-1",
      amountCents: 5000,
      currency: "USD",
      receipt: "receipt-1",
    });

    expect(result).toMatchObject({
      ok: true,
      orderId: "order-1",
      changed: true,
      needsRefund: false,
    });

    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: "order-1",
        status: "PENDING",
        paymentStatus: { not: "PAID" },
      },
      data: expect.objectContaining({
        status: "PAID",
        paymentStatus: "PAID",
      }),
    });
    expect(sendOrderConfirmationMock).toHaveBeenCalledWith("order-1");
  });

  it("flags a second payment for a refund when the order is already paid", async () => {
    prismaMock.order.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.order.findUniqueOrThrow.mockResolvedValue({
      ...pendingOrder,
      status: "PAID",
      paymentStatus: "PAID",
    });

    const result = await settleAttemptSuccess({
      reference: "ref-1",
      amountCents: 5000,
      currency: "USD",
    });

    expect(result).toMatchObject({
      ok: true,
      orderId: "order-1",
      changed: false,
      needsRefund: true,
    });
    expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
    expect(prismaMock.paymentAttempt.updateMany).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          status: "SUCCESS",
          failureReason: null,
        }),
      }),
    );

    expect(prismaMock.paymentAttempt.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          id: attempt.id,
          status: "SUCCESS",
        }),

        data: {
          refundStatus: "PENDING",
          refundReason: "Order was already paid or is no longer payable",
          failureReason:
            "Refund required: order was already paid or is no longer payable",
        },
      }),
    );
  });

  it("re-reserves stock when a cancelled order can still be paid", async () => {
    prismaMock.order.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    prismaMock.order.findUniqueOrThrow.mockResolvedValue({
      ...pendingOrder,
      status: "CANCELLED",
      paymentStatus: "UNPAID",
    });

    const result = await settleAttemptSuccess({
      reference: "ref-1",
      amountCents: 5000,
      currency: "USD",
    });

    expect(reReserveOrderMock).toHaveBeenCalledWith(
      expect.anything(),
      "order-1",
    );
    expect(result).toMatchObject({
      ok: true,
      changed: true,
      needsRefund: false,
    });
  });

  it("rejects a payment when the reported amount does not match", async () => {
    const result = await settleAttemptSuccess({
      reference: "ref-1",
      amountCents: 4000, // Expected amount is 5000
      currency: "USD",
      receipt: "receipt-1",
    });

    expect(result).toMatchObject({
      ok: false,
      reason: expect.stringContaining("Amount mismatch"),
    });

    expect(prismaMock.paymentAttempt.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
  });

  it("does not settle the same successful payment twice", async () => {
    // Simulate the payment attempt already being claimed by an earlier callback.
    prismaMock.paymentAttempt.updateMany.mockResolvedValue({ count: 0 });

    const result = await settleAttemptSuccess({
      reference: "ref-1",
      amountCents: 5000,
      currency: "USD",
      receipt: "receipt-1",
    });

    expect(result).toMatchObject({
      ok: true,
      orderId: "order-1",
      changed: false,
      needsRefund: false,
    });

    expect(prismaMock.paymentAttempt.updateMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
    expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
  });

  it("flags a refund when late payment cannot re-reserve stock", async () => {
    reReserveOrderMock.mockRejectedValueOnce(
      new StockUnavailableError("Not enough stock for Laptop"),
    );

    // First transaction: claim the attempt and cancelled order,
    // then roll back when stock cannot be re-reserved.
    prismaMock.order.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });

    prismaMock.order.findUniqueOrThrow.mockResolvedValue({
      ...pendingOrder,
      status: "CANCELLED",
      paymentStatus: "UNPAID",
    });

    // Keep the existing fallback behaviour for this baseline test.
    prismaMock.$transaction.mockImplementation(async (operation: unknown) => {
      if (typeof operation === "function") {
        return operation(transactionClient());
      }

      return Promise.all(operation as Promise<unknown>[]);
    });

    const result = await settleAttemptSuccess({
      reference: "ref-1",
      amountCents: 5000,
      currency: "USD",
      receipt: "receipt-late-1",
    });

    expect(result).toMatchObject({
      ok: true,
      orderId: "order-1",
      changed: false,
      needsRefund: true,
    });

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
    expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
    expect(prismaMock.paymentAttempt.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          id: attempt.id,
          status: { in: ["PENDING", "FAILED"] },
        },
        data: expect.objectContaining({
          refundStatus: "PENDING",
          refundReason: "Paid after expiry, but stock is unavailable",
        }),
      }),
    );
  });

  it("does not overwrite an order paid by another callback during the refund fallback", async () => {
    reReserveOrderMock.mockRejectedValueOnce(
      new StockUnavailableError("Not enough stock for Laptop"),
    );

    // Initial transaction: the order was cancelled, then stock reservation fails.
    prismaMock.order.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 })
      // Fallback: another callback has already paid the order.
      .mockResolvedValueOnce({ count: 0 });

    prismaMock.order.findUniqueOrThrow.mockResolvedValue({
      ...pendingOrder,
      status: "CANCELLED",
      paymentStatus: "UNPAID",
    });

    prismaMock.$transaction.mockImplementation(async (operation: unknown) => {
      if (typeof operation === "function") {
        return operation(transactionClient());
      }

      throw new Error("Unexpected transaction operation in this test");
    });

    const result = await settleAttemptSuccess({
      reference: "ref-1",
      amountCents: 5000,
      currency: "USD",
      receipt: "late-receipt",
    });

    expect(result).toMatchObject({
      ok: true,
      orderId: "order-1",
      changed: false,
      needsRefund: true,
    });

    expect(prismaMock.order.update).not.toHaveBeenCalled();

    expect(prismaMock.order.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: {
          id: "order-1",
          status: "CANCELLED",
          paymentStatus: { not: "PAID" },
        },
        data: expect.objectContaining({
          paymentReceipt: "late-receipt",
        }),
      }),
    );

    expect(sendOrderConfirmationMock).not.toHaveBeenCalled();
  });

  it("allows a successful retry after an earlier payment failure", async () => {
    // The retry has its own payment attempt, currently pending.
    prismaMock.paymentAttempt.findUnique.mockResolvedValue({
      ...attempt,
      id: "attempt-2",
      reference: "retry-ref-1",
      status: "PENDING",
    });

    // The order's previous attempt failed, but the order is still pending.
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });

    const result = await settleAttemptSuccess({
      reference: "retry-ref-1",
      amountCents: 5000,
      currency: "USD",
      receipt: "retry-receipt-1",
    });

    expect(result).toMatchObject({
      ok: true,
      orderId: "order-1",
      changed: true,
      needsRefund: false,
    });

    expect(prismaMock.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "order-1",
          status: "PENDING",
          paymentStatus: { not: "PAID" },
        },
        data: expect.objectContaining({
          status: "PAID",
          paymentStatus: "PAID",
        }),
      }),
    );

    expect(sendOrderConfirmationMock).toHaveBeenCalledWith("order-1");
  });
});

describe("settleAttemptFailure", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    prismaMock.paymentAttempt.findUnique.mockResolvedValue(attempt);
    prismaMock.paymentAttempt.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });

    prismaMock.$transaction.mockImplementation(async (operation: unknown) => {
      if (typeof operation === "function") {
        return operation(transactionClient());
      }

      throw new Error("Unexpected transaction operation in this test");
    });
  });

  it("marks a pending attempt as failed and updates the unpaid order", async () => {
    await settleAttemptFailure("ref-1", "Payment declined");

    expect(prismaMock.paymentAttempt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "attempt-1", status: "PENDING" },
        data: expect.objectContaining({
          status: "FAILED",
          failureReason: "Payment declined",
        }),
      }),
    );

    expect(prismaMock.order.updateMany).toHaveBeenCalledWith({
      where: {
        id: "order-1",
        status: "PENDING",
        paymentStatus: "UNPAID",
      },
      data: { paymentStatus: "FAILED" },
    });
  });

  it("does not change the order when the attempt is already successful", async () => {
    prismaMock.paymentAttempt.updateMany.mockResolvedValue({ count: 0 });

    await settleAttemptFailure("ref-1", "Delayed failure callback");

    expect(prismaMock.paymentAttempt.updateMany).toHaveBeenCalled();
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
  });

  it("does nothing when the payment reference is unknown", async () => {
    prismaMock.paymentAttempt.findUnique.mockResolvedValue(null);

    await settleAttemptFailure("unknown-ref", "Payment declined");

    expect(prismaMock.paymentAttempt.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("limits the stored failure reason to 200 characters", async () => {
    const longReason = "x".repeat(300);

    await settleAttemptFailure("ref-1", longReason);

    expect(prismaMock.paymentAttempt.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          failureReason: "x".repeat(200),
        }),
      }),
    );
  });
});
