import { z } from "zod";

export const productInputSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(150),
  description: z.string().trim().min(10, "Description must be at least 10 characters").max(5000),
  price: z.coerce.number().min(0.01, "Price must be at least 0.01").max(1_000_000),
  stock: z.coerce.number().int().min(0).max(1_000_000),
  lowStockThreshold: z.coerce.number().int().min(0).max(100_000).default(5),
  categoryId: z.string().min(1, "Choose a category"),
  brand: z.string().trim().max(100).optional().transform((v) => v || null),
  imageUrl: z
    .string()
    .trim()
    .url("Enter a valid image URL")
    .refine((u) => u.startsWith("https://"), "Image URL must use https")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  featured: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export const adminProductQuerySchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional().catch(undefined),
  page: z.coerce.number().int().min(1).catch(1),
});

export function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
