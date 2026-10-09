import { describe, expect, it } from "vitest";
import { applyDiscount, discountInputSchema, type DiscountLike } from "@/lib/validations/discount";

const base: DiscountLike = { type: "PERCENT", value: 10, active: true, expiresAt: null, usageLimit: null, usedCount: 0, minSubtotalCents: 0 };

describe("discount input", () => {
  it("normalises code and converts fixed dollars to cents", () => {
    const r = discountInputSchema.parse({ code: " save5 ", type: "FIXED", value: "5.50", minSubtotal: "20" });
    expect(r.code).toBe("SAVE5");
    expect(r.value).toBe(550);
    expect(r.minSubtotalCents).toBe(2000);
  });
  it("rejects percent over 100 and bad codes", () => {
    expect(discountInputSchema.safeParse({ code: "ABC", type: "PERCENT", value: "150" }).success).toBe(false);
    expect(discountInputSchema.safeParse({ code: "a b", type: "PERCENT", value: "10" }).success).toBe(false);
  });
});

describe("applyDiscount", () => {
  it("applies percent and caps fixed to the subtotal", () => {
    expect(applyDiscount(base, 5000)).toEqual({ ok: true, amountCents: 500 });
    expect(applyDiscount({ ...base, type: "FIXED", value: 9000 }, 5000)).toEqual({ ok: true, amountCents: 5000 });
  });
  it("rejects inactive, expired, exhausted and under-minimum codes", () => {
    expect(applyDiscount({ ...base, active: false }, 5000).ok).toBe(false);
    expect(applyDiscount({ ...base, expiresAt: new Date("2000-01-01") }, 5000).ok).toBe(false);
    expect(applyDiscount({ ...base, usageLimit: 1, usedCount: 1 }, 5000).ok).toBe(false);
    expect(applyDiscount({ ...base, minSubtotalCents: 6000 }, 5000).ok).toBe(false);
  });
});
