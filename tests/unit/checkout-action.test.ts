import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  clientIp: vi.fn(),
  rateLimit: vi.fn(),
  prisma: {
    order: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  tx: {
    storeSettings: {
      findUnique: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    stockMovement: {
      create: vi.fn(),
    },
    discount: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    order: {
      create: vi.fn(),
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

import { placeOrderAction } from "@/actions/checkout";

describe("placeOrderAction coupon claiming", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.auth.mockResolvedValue(null);
    mocks.clientIp.mockResolvedValue("127.0.0.1");
    mocks.rateLimit.mockReturnValue(true);

    mocks.prisma.order.findUnique.mockResolvedValue(null);

    mocks.tx.storeSettings.findUnique.mockResolvedValue(null);

    mocks.tx.product.findMany.mockResolvedValue([
      {
        id: "product-123",
        name: "Test product",
        priceCents: 10000,
        stock: 5,
        status: "ACTIVE",
      },
    ]);

    mocks.tx.product.updateMany.mockResolvedValue({ count: 1 });
    mocks.tx.stockMovement.create.mockResolvedValue({});

    mocks.tx.discount.findUnique.mockResolvedValue({
      id: "discount-123",
      code: "SAVE10",
      type: "PERCENT",
      value: 10,
      active: true,
      expiresAt: null,
      usageLimit: 1,
      usedCount: 0,
      minSubtotalCents: 0,
    });

    mocks.tx.discount.updateMany.mockResolvedValue({ count: 0 });

    mocks.tx.order.create.mockResolvedValue({
      id: "order-123",
      number: 123,
    });

    mocks.prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof mocks.tx) => Promise<unknown>) =>
        callback(mocks.tx),
    );
  });

  it("does not create an order when the coupon claim fails", async () => {
    const result = await placeOrderAction({
      email: "customer@example.com",
      items: [{ productId: "product-123", quantity: 1 }],
      couponCode: "SAVE10",
      shipping: {
        fullName: "Test Customer",
        line1: "123 Test Street",
        line2: "",
        city: "Mombasa",
        state: "Mombasa",
        postalCode: "80100",
        country: "KE",
        phone: "0712345678",
      },
      idempotencyKey: "checkout-test-123",
    });

    expect(result).toEqual({
      ok: false,
      error: "This coupon is no longer available. Please try another coupon.",
    });

    expect(mocks.tx.discount.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "discount-123",
          active: true,
        }),
        data: {
          usedCount: { increment: 1 },
        },
      }),
    );

    expect(mocks.tx.order.create).not.toHaveBeenCalled();
  });
});
