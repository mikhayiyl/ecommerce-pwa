import { z } from "zod";

export const reviewSchema = z.object({
  productId: z.string().min(1),
  rating: z.coerce.number().int("Pick a rating").min(1, "Pick a rating").max(5, "Pick a rating"),
  comment: z.string().trim().min(10, "Review must be at least 10 characters").max(1000, "Review is too long"),
});

export function averageRating(ratings: number[]): number {
  if (ratings.length === 0) return 0;
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
  return Math.round(avg * 10) / 10;
}
