import { describe, expect, it } from "vitest";
import { calculateTotals } from "@/features/cart/pricing";

describe("calculateTotals", () => {
  it("returns zero for an empty cart", () => {
    expect(calculateTotals(0)).toEqual({ subtotalCents: 0, discountCents: 0, shippingCents: 0, totalCents: 0 });
  });

  it("adds flat shipping under the free-shipping threshold", () => {
    expect(calculateTotals(2000)).toMatchObject({ shippingCents: 599, totalCents: 2599 });
  });

  it("gives free shipping at or above the threshold", () => {
    expect(calculateTotals(10000)).toMatchObject({ shippingCents: 0, totalCents: 10000 });
  });

  it("applies discounts before the shipping check and never goes negative", () => {
    expect(calculateTotals(10000, 2000)).toMatchObject({ shippingCents: 599, totalCents: 8599 });
    expect(calculateTotals(1000, 5000).totalCents).toBe(599);
  });
});
