import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  clientIp: vi.fn(),
  rateLimit: vi.fn(),
  initializePaystack: vi.fn(),
  stkPush: vi.fn(),
  settleAttemptFailure: vi.fn(),
  prisma: {
    order: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    paymentAttempt: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: mocks.prisma,
}));

vi.mock("@/lib/security/client-ip", () => ({
  clientIp: mocks.clientIp,
}));

vi.mock("@/lib/security/rate-limit", () => ({
  rateLimit: mocks.rateLimit,
}));

vi.mock("@/lib/site", () => ({
  siteUrl: () => "https://shop.example.com",
}));

vi.mock("@/features/orders/release", () => ({
  PAYMENT_GRACE_MINUTES: 15,
  holdUntil: (date: Date, minutes: number) =>
    new Date(date.getTime() + minutes * 60_000),
}));

vi.mock("@/features/payments/methods", () => ({
  availableMethods: () => ["PAYSTACK", "MPESA"],
  chargeCents: (_provider: string, cents: number) => cents,
  mpesaWholeAmount: (cents: number) => Math.ceil(cents / 100),
}));

vi.mock("@/features/payments/mpesa", () => ({
  normalizeKenyanPhone: () => "254712345678",
  stkPush: mocks.stkPush,
  stkQuery: vi.fn(),
}));

vi.mock("@/features/payments/paystack", () => ({
  initializePaystack: mocks.initializePaystack,
  verifyPaystack: vi.fn(),
}));

vi.mock("@/features/payments/settle", () => ({
  settleAttemptFailure: mocks.settleAttemptFailure,
  settleAttemptSuccess: vi.fn(),
}));

import { startPaymentAction } from "@/actions/payments";

const order = {
  id: "order-123",
  userId: null,
  status: "PENDING",
  paymentStatus: "FAILED",
  expiresAt: new Date(Date.now() + 60 * 60_000),
  currency: "KES",
  totalCents: 2500,
  email: "customer@example.com",
  number: "1001",
};

describe("startPaymentAction payment retries", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.auth.mockResolvedValue({
      user: { id: "user-123" },
    });

    mocks.clientIp.mockResolvedValue("127.0.0.1");
    mocks.rateLimit.mockReturnValue(true);

    mocks.prisma.order.findUnique.mockResolvedValue({ ...order });
    mocks.prisma.order.updateMany.mockResolvedValue({ count: 1 });

    mocks.prisma.paymentAttempt.create.mockResolvedValue({
      id: "attempt-new",
    });

    mocks.prisma.paymentAttempt.findFirst.mockResolvedValue(null);
    mocks.prisma.paymentAttempt.update.mockResolvedValue({});

    mocks.initializePaystack.mockResolvedValue({
      authorizationUrl: "https://paystack.example.com/checkout",
    });

    mocks.stkPush.mockResolvedValue({
      checkoutRequestId: "ws_CO_456",
    });

    mocks.settleAttemptFailure.mockResolvedValue(undefined);
  });

  it("allows a new Paystack attempt after an earlier payment failed", async () => {
    const result = await startPaymentAction({
      orderId: "order-123",
      method: "PAYSTACK",
    });

    expect(result).toEqual({
      ok: true,
      kind: "redirect",
      url: "https://paystack.example.com/checkout",
    });

    expect(mocks.prisma.paymentAttempt.create).toHaveBeenCalledTimes(1);
    expect(mocks.initializePaystack).toHaveBeenCalledTimes(1);
  });

  it("blocks another M-Pesa prompt when a recent attempt is pending", async () => {
    mocks.prisma.paymentAttempt.findFirst.mockResolvedValue({
      id: "attempt-pending",
      status: "PENDING",
    });

    const result = await startPaymentAction({
      orderId: "order-123",
      method: "MPESA",
      phone: "0712345678",
    });

    expect(result).toMatchObject({
      ok: false,
      error: expect.stringContaining("already sent an M-Pesa prompt"),
    });

    expect(mocks.stkPush).not.toHaveBeenCalled();
    expect(mocks.prisma.paymentAttempt.create).not.toHaveBeenCalled();
  });

  it("allows a new M-Pesa prompt when no pending attempt exists", async () => {
    const result = await startPaymentAction({
      orderId: "order-123",
      method: "MPESA",
      phone: "0712345678",
    });

    expect(result).toMatchObject({
      ok: true,
      kind: "prompt",
    });

    expect(mocks.prisma.paymentAttempt.create).toHaveBeenCalledTimes(1);
    expect(mocks.stkPush).toHaveBeenCalledTimes(1);

    expect(mocks.prisma.paymentAttempt.update).toHaveBeenCalledWith({
      where: { id: "attempt-new" },
      data: { reference: "ws_CO_456" },
    });
  });

  it("marks a Paystack attempt failed when initialization throws", async () => {
    mocks.initializePaystack.mockRejectedValue(
      new Error("Provider unavailable"),
    );

    const result = await startPaymentAction({
      orderId: "order-123",
      method: "PAYSTACK",
    });

    expect(result).toMatchObject({
      ok: false,
      error: "Could not start the payment. Please try again.",
    });

    expect(mocks.settleAttemptFailure).toHaveBeenCalledWith(
      expect.stringMatching(/^order-123-/),
      "Could not start the payment",
    );
  });

  it("marks an M-Pesa attempt failed when the prompt request throws", async () => {
    mocks.stkPush.mockRejectedValue(new Error("Provider unavailable"));

    const result = await startPaymentAction({
      orderId: "order-123",
      method: "MPESA",
      phone: "0712345678",
    });

    expect(result).toMatchObject({
      ok: false,
      error: "Could not send the M-Pesa prompt. Please try again.",
    });

    expect(mocks.settleAttemptFailure).toHaveBeenCalledWith(
      expect.stringMatching(/^pending-/),
      "Could not send the M-Pesa prompt",
    );
  });
});
