import { z } from "zod";

export const PAGE_SIZE = 12;

export const SORT_OPTIONS = {
  newest: "Newest",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  rating: "Top rated",
} as const;

export const productQuerySchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  category: z.string().max(100).optional().catch(undefined),
  min: z.coerce.number().min(0).optional().catch(undefined),
  max: z.coerce.number().min(0).optional().catch(undefined),
  rating: z.coerce.number().min(1).max(5).optional().catch(undefined),
  inStock: z.enum(["1"]).optional().catch(undefined),
  sort: z.enum(["newest", "price-asc", "price-desc", "rating"]).catch("newest"),
  page: z.coerce.number().int().min(1).catch(1),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
