import { describe, expect, it } from "vitest";
import { productQuerySchema } from "@/lib/validations/product";

describe("productQuerySchema", () => {
  it("applies defaults", () => {
    expect(productQuerySchema.parse({})).toMatchObject({ sort: "newest", page: 1 });
  });

  it("falls back safely on invalid values", () => {
    const q = productQuerySchema.parse({ page: "abc", sort: "bad", min: "x", rating: "9" });
    expect(q).toMatchObject({ page: 1, sort: "newest" });
    expect(q.min).toBeUndefined();
    expect(q.rating).toBeUndefined();
  });

  it("parses valid filters", () => {
    const q = productQuerySchema.parse({ q: " phone ", min: "10", max: "100", page: "3", sort: "price-asc", inStock: "1" });
    expect(q).toMatchObject({ q: "phone", min: 10, max: 100, page: 3, sort: "price-asc", inStock: "1" });
  });
});
