import { z } from "zod";
import { addressSchema } from "./address";

export const checkoutItemsSchema = z
  .array(
    z.object({
      productId: z.string().min(1).max(40),
      quantity: z.number().int().min(1).max(1000),
    }),
  )
  .min(1, "Your cart is empty")
  .max(50);

export const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_-]{3,24}$/, "Invalid coupon code");

export const checkoutSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  items: checkoutItemsSchema,
  couponCode: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(couponCodeSchema.optional()),
  shipping: addressSchema.omit({ isDefault: true }),
  /** Random key per checkout attempt; a retried request returns the order it already created. */
  idempotencyKey: z.string().trim().min(8).max(64),
  /** The total the customer saw. If prices or shipping moved since, the order is refused instead of surprising them. */
  expectedTotalCents: z.number().int().min(0).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
