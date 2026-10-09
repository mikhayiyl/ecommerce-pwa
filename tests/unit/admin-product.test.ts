import { describe, expect, it } from "vitest";
import { productInputSchema, slugify } from "@/lib/validations/admin-product";

const valid = {
  name: "Test Widget",
  description: "A widget for testing things.",
  price: "19.99",
  stock: "4",
  categoryId: "cat1",
  status: "ACTIVE",
};

describe("productInputSchema", () => {
  it("coerces form values", () => {
    const r = productInputSchema.parse({ ...valid, featured: "on", imageUrl: "" });
    expect(r.price).toBe(19.99);
    expect(r.stock).toBe(4);
    expect(r.featured).toBe(true);
    expect(r.imageUrl).toBeUndefined();
    expect(r.lowStockThreshold).toBe(5);
  });
  it("rejects bad price, negative stock and http images", () => {
    expect(productInputSchema.safeParse({ ...valid, price: "0" }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, stock: "-1" }).success).toBe(false);
    expect(productInputSchema.safeParse({ ...valid, imageUrl: "http://x.com/a.png" }).success).toBe(false);
  });
});

describe("slugify", () => {
  it("makes url-safe slugs", () => {
    expect(slugify("  Hello, World! & Co  ")).toBe("hello-world-co");
  });
});
