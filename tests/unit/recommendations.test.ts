import { describe, expect, it } from "vitest";
import { buildSignals, rank } from "@/features/recommendations/score";

const mk = (id: string, categoryId: string, priceCents: number, rating = 4, stock = 5) => ({ id, categoryId, priceCents, rating, stock });

describe("recommendation ranking", () => {
  it("prefers the category the shopper engaged with", () => {
    const signals = buildSignals([{ categoryId: "laptops", priceCents: 100000, weight: 3 }]);
    const out = rank([mk("a", "watches", 100000, 5), mk("b", "laptops", 100000, 3)], signals, 2);
    expect(out.map((p) => p.id)).toEqual(["b", "a"]);
  });
  it("prefers prices near the shopper average", () => {
    const signals = buildSignals([{ categoryId: "c", priceCents: 10000, weight: 1 }]);
    const out = rank([mk("far", "c", 90000), mk("near", "c", 11000)], signals, 1);
    expect(out[0].id).toBe("near");
  });
  it("never recommends out-of-stock items", () => {
    const out = rank([mk("x", "c", 100, 5, 0)], buildSignals([]), 5);
    expect(out).toEqual([]);
  });
});
