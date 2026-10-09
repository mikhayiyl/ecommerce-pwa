import { describe, expect, it } from "vitest";
import { parseQuery } from "@/lib/ai/parse-query";

const cats = [
  { name: "Laptops", slug: "laptops" },
  { name: "Mens Watches", slug: "mens-watches" },
];

describe("parseQuery", () => {
  it("extracts max price and keywords", () => {
    const r = parseQuery("Find wireless headphones under $100 for travel");
    expect(r.max).toBe(100);
    expect(r.keywords).toEqual(["wireless", "headphones", "travel"]);
  });
  it("handles ranges, rating and stock", () => {
    const r = parseQuery("laptops between $500 and 1,500 4 stars in stock", cats);
    expect(r).toMatchObject({ min: 500, max: 1500, rating: 4, inStock: true, category: "laptops" });
    expect(r.keywords).toEqual([]);
  });
  it("detects sort intent", () => {
    expect(parseQuery("cheapest laptop", cats).sort).toBe("price-asc");
  });
});
