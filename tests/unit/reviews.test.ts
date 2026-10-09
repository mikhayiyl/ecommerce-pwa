import { describe, expect, it } from "vitest";
import { averageRating, reviewSchema } from "@/lib/validations/review";

describe("reviews", () => {
  it("averages ratings to one decimal", () => {
    expect(averageRating([])).toBe(0);
    expect(averageRating([5, 4, 4])).toBe(4.3);
  });

  it("validates input", () => {
    expect(reviewSchema.safeParse({ productId: "p", rating: "5", comment: "Really great product" }).success).toBe(true);
    expect(reviewSchema.safeParse({ productId: "p", rating: "0", comment: "Really great product" }).success).toBe(false);
    expect(reviewSchema.safeParse({ productId: "p", rating: "6", comment: "Really great product" }).success).toBe(false);
    expect(reviewSchema.safeParse({ productId: "p", rating: "4", comment: "short" }).success).toBe(false);
  });
});
