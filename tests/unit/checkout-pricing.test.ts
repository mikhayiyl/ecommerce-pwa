import { describe, expect, it } from "vitest";
import { computeOrderTotals, resolveCoupon, DEFAULT_RULES } from "@/features/checkout/pricing";
import { checkoutSchema } from "@/lib/validations/checkout";

const coupon = { code: "SAVE5", type: "FIXED" as const, value: 500, active: true, expiresAt: null, usageLimit: null, usedCount: 0, minSubtotalCents: 0 };
const key = "attempt-12345678";
const ship = { fullName: "A B", line1: "1 St", city: "Lagos", postalCode: "100001", country: "Nigeria" };

describe("computeOrderTotals", () => {
  it("adds flat shipping below the free threshold", () => {
    expect(computeOrderTotals(5000, 0, DEFAULT_RULES).totalCents).toBe(5599);
  });
  it("is free shipping once the discounted subtotal reaches the threshold", () => {
    expect(computeOrderTotals(10000, 0, DEFAULT_RULES).shippingCents).toBe(0);
    expect(computeOrderTotals(10400, 500, DEFAULT_RULES).shippingCents).toBe(599);
  });
  it("applies tax on the discounted subtotal", () => {
    const t = computeOrderTotals(20000, 5000, { ...DEFAULT_RULES, taxPercent: 10 });
    expect(t).toMatchObject({ taxCents: 1500, totalCents: 16500 });
  });
});

describe("resolveCoupon", () => {
  it("rejects unknown and accepts valid codes", () => {
    expect(resolveCoupon(null, 1000).ok).toBe(false);
    expect(resolveCoupon(coupon, 1000)).toEqual({ ok: true, code: "SAVE5", amountCents: 500 });
  });
  it("never discounts more than the subtotal", () => {
    expect(resolveCoupon(coupon, 300)).toMatchObject({ amountCents: 300 });
  });
});

describe("checkoutSchema", () => {
  it("normalises email and coupon", () => {
    const r = checkoutSchema.parse({ email: " A@B.COM ", items: [{ productId: "x", quantity: 1 }], couponCode: "save5", shipping: ship, idempotencyKey: key });
    expect(r.email).toBe("a@b.com");
    expect(r.couponCode).toBe("SAVE5");
  });
  it("rejects an empty cart and bad email", () => {
    expect(checkoutSchema.safeParse({ email: "nope", items: [], shipping: ship, idempotencyKey: key }).success).toBe(false);
  });
  it("requires an idempotency key and accepts an expected total", () => {
    const base = { email: "a@b.co", items: [{ productId: "x", quantity: 1 }], shipping: ship };
    expect(checkoutSchema.safeParse(base).success).toBe(false);
    expect(checkoutSchema.safeParse({ ...base, idempotencyKey: "short" }).success).toBe(false);
    expect(checkoutSchema.parse({ ...base, idempotencyKey: key, expectedTotalCents: 1999 }).expectedTotalCents).toBe(1999);
    expect(checkoutSchema.safeParse({ ...base, idempotencyKey: key, expectedTotalCents: -1 }).success).toBe(false);
  });
  it("treats a blank coupon as none", () => {
    expect(checkoutSchema.parse({ email: "a@b.co", items: [{ productId: "x", quantity: 1 }], couponCode: "", shipping: ship, idempotencyKey: key }).couponCode).toBeUndefined();
  });
});
