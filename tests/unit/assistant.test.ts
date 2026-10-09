import { describe, expect, it } from "vitest";
import { rateLimit, splitComparison } from "@/lib/ai/intent";
import { fallbackReply, factsBlock } from "@/lib/ai/assistant";

const p = (name: string, priceCents: number, rating: number, stock = 5) => ({
  slug: name.toLowerCase(), name, brand: null, priceCents, currency: "usd", stock, rating, category: { name: "Laptops" },
});

describe("splitComparison", () => {
  it("splits vs and compare-and phrasing", () => {
    expect(splitComparison("macbook vs dell xps")).toEqual(["macbook", "dell xps"]);
    expect(splitComparison("Compare the Lenovo Yoga and Asus Zenbook?")).toEqual(["the Lenovo Yoga", "Asus Zenbook"]);
  });
  it("returns null for non-comparisons", () => {
    expect(splitComparison("cheap laptops")).toBeNull();
  });
});

describe("rateLimit", () => {
  it("blocks after the limit and resets after the window", () => {
    for (let i = 0; i < 3; i++) expect(rateLimit("k1", 3, 1000, 0)).toBe(true);
    expect(rateLimit("k1", 3, 1000, 10)).toBe(false);
    expect(rateLimit("k1", 3, 1000, 2000)).toBe(true);
  });
});

describe("grounded replies", () => {
  it("facts block carries DB price and stock", () => {
    const f = factsBlock([p("A", 12345, 4.2, 0)]);
    expect(f).toContain("$123.45");
    expect(f).toContain("out of stock");
  });
  it("fallback comparison names the cheaper product", () => {
    expect(fallbackReply([p("A", 1000, 4), p("B", 2000, 5)], true)).toContain("A is cheaper");
  });
  it("fallback handles no results", () => {
    expect(fallbackReply([], false)).toMatch(/couldn't find/);
  });
});
