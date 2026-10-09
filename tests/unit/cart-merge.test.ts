import { describe, expect, it } from "vitest";
import { mergeCarts } from "@/features/cart/merge";

describe("mergeCarts", () => {
  const stock = new Map([["a", 5], ["b", 1], ["c", 50]]);

  it("sums quantities and caps by stock", () => {
    const r = mergeCarts([{ productId: "a", quantity: 3 }], [{ productId: "a", quantity: 4 }, { productId: "b", quantity: 2 }], stock);
    expect(r).toEqual([{ productId: "a", quantity: 5 }, { productId: "b", quantity: 1 }]);
  });

  it("caps at the per-item maximum", () => {
    expect(mergeCarts([{ productId: "c", quantity: 8 }], [{ productId: "c", quantity: 8 }], stock)).toEqual([
      { productId: "c", quantity: 10 },
    ]);
  });

  it("drops unavailable products", () => {
    expect(mergeCarts([{ productId: "zzz", quantity: 1 }], [], stock)).toEqual([]);
  });
});
