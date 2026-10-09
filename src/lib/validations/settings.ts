import { z } from "zod";

export const settingsInputSchema = z.object({
  name: z.string().trim().min(1, "Store name is required").max(60),
  currency: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{3}$/, "Use a 3-letter currency code"),
  shippingFlat: z.coerce.number({ error: "Shipping must be a number" }).min(0).max(1000),
  freeShippingOver: z.coerce.number({ error: "Threshold must be a number" }).min(0).max(100000),
  taxPercent: z.coerce.number({ error: "Tax must be a number" }).min(0, "Tax can't be negative").max(100, "Tax can't exceed 100%"),
});

export function settingsToData(input: z.infer<typeof settingsInputSchema>) {
  return {
    name: input.name,
    currency: input.currency,
    shippingFlatCents: Math.round(input.shippingFlat * 100),
    freeShippingOverCents: Math.round(input.freeShippingOver * 100),
    taxPercent: input.taxPercent,
  };
}
