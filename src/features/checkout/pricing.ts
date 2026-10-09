import { applyDiscount, type DiscountLike } from "@/lib/validations/discount";

export type ShippingRules = { shippingFlatCents: number; freeShippingOverCents: number; taxPercent: number };

export type OrderTotals = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
};

export const DEFAULT_RULES: ShippingRules = { shippingFlatCents: 599, freeShippingOverCents: 10000, taxPercent: 0 };

export function computeOrderTotals(subtotalCents: number, discountCents: number, rules: ShippingRules): OrderTotals {
  const discounted = Math.max(0, subtotalCents - discountCents);
  const shippingCents = subtotalCents === 0 || discounted >= rules.freeShippingOverCents ? 0 : rules.shippingFlatCents;
  const taxCents = Math.round((discounted * rules.taxPercent) / 100);
  return { subtotalCents, discountCents, shippingCents, taxCents, totalCents: discounted + shippingCents + taxCents };
}

export function resolveCoupon(
  discount: (DiscountLike & { code: string }) | null,
  subtotalCents: number,
): { ok: true; code: string | null; amountCents: number } | { ok: false; reason: string } {
  if (!discount) return { ok: false, reason: "Invalid coupon code" };
  const result = applyDiscount(discount, subtotalCents);
  return result.ok ? { ok: true, code: discount.code, amountCents: result.amountCents } : result;
}
