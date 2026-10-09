import { z } from "zod";

export const discountInputSchema = z
  .object({
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{3,24}$/, "Code: 3-24 letters, numbers, - or _"),
    type: z.enum(["PERCENT", "FIXED"]),
    // PERCENT: whole percent. FIXED: dollars (converted to cents below).
    value: z.coerce.number().positive("Value must be positive"),
    expiresAt: z
      .string()
      .optional()
      .transform((v) => (v ? new Date(`${v}T23:59:59Z`) : null))
      .refine((d) => d === null || !Number.isNaN(d.getTime()), "Invalid date"),
    usageLimit: z
      .string()
      .optional()
      .transform((v) => (v ? Number(v) : null))
      .refine((n) => n === null || (Number.isInteger(n) && n > 0), "Usage limit must be a positive whole number"),
    minSubtotal: z.coerce.number().min(0).default(0),
    active: z.boolean().default(true),
  })
  .superRefine((d, ctx) => {
    if (d.type === "PERCENT" && (d.value > 100 || !Number.isInteger(d.value))) {
      ctx.addIssue({ code: "custom", path: ["value"], message: "Percent must be a whole number from 1 to 100" });
    }
  })
  .transform((d) => ({
    code: d.code,
    type: d.type,
    value: d.type === "PERCENT" ? d.value : Math.round(d.value * 100),
    expiresAt: d.expiresAt,
    usageLimit: d.usageLimit,
    minSubtotalCents: Math.round(d.minSubtotal * 100),
    active: d.active,
  }));

export type DiscountLike = {
  type: "PERCENT" | "FIXED";
  value: number;
  active: boolean;
  expiresAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
  minSubtotalCents: number;
};

export type DiscountResult = { ok: true; amountCents: number } | { ok: false; reason: string };

// Single source of truth for coupon maths; checkout must call this server-side.
export function applyDiscount(d: DiscountLike, subtotalCents: number, now = new Date()): DiscountResult {
  if (!d.active) return { ok: false, reason: "This code is not active" };
  if (d.expiresAt && d.expiresAt < now) return { ok: false, reason: "This code has expired" };
  if (d.usageLimit !== null && d.usedCount >= d.usageLimit) return { ok: false, reason: "This code has reached its usage limit" };
  if (subtotalCents < d.minSubtotalCents) return { ok: false, reason: "Order total is below the minimum for this code" };
  const raw = d.type === "PERCENT" ? Math.round((subtotalCents * d.value) / 100) : d.value;
  return { ok: true, amountCents: Math.min(raw, subtotalCents) };
}
