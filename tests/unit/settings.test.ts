import { describe, expect, it } from "vitest";
import { settingsInputSchema, settingsToData } from "@/lib/validations/settings";

const base = { name: "Shop", currency: "USD", shippingFlat: "5.99", freeShippingOver: "100", taxPercent: "8.5" };

describe("settings validation", () => {
  it("converts dollars to cents and lowercases currency", () => {
    const data = settingsToData(settingsInputSchema.parse(base));
    expect(data).toEqual({ name: "Shop", currency: "usd", shippingFlatCents: 599, freeShippingOverCents: 10000, taxPercent: 8.5 });
  });
  it("rejects bad currency and tax", () => {
    expect(settingsInputSchema.safeParse({ ...base, currency: "dollars" }).success).toBe(false);
    expect(settingsInputSchema.safeParse({ ...base, taxPercent: "120" }).success).toBe(false);
    expect(settingsInputSchema.safeParse({ ...base, shippingFlat: "-1" }).success).toBe(false);
  });
});
