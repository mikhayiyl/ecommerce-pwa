"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkoutSchema } from "@/lib/validations/checkout";
import { applyDiscount } from "@/lib/validations/discount";
import { computeOrderTotals, resolveCoupon, DEFAULT_RULES, type OrderTotals } from "@/features/checkout/pricing";
import { getCartDetails, type CartLine } from "@/actions/cart";
import { MAX_QTY_PER_ITEM } from "@/features/cart/pricing";

export type PlaceOrderResult = { ok: true; orderId: string; number: number } | { ok: false; error: string };

class CheckoutError extends Error {}

export type Quote = {
  lines: CartLine[];
  totals: OrderTotals;
  couponCode: string | null;
  couponError?: string;
};

/** Server-calculated preview of the order; the real order is re-validated in placeOrderAction. */
export async function getQuoteAction(items: unknown, coupon?: string): Promise<Quote> {
  const { lines } = await getCartDetails(items);
  const subtotal = lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
  const settings = await prisma.storeSettings.findUnique({ where: { id: "store" } });
  const rules = settings ?? DEFAULT_RULES;
  let discountCents = 0;
  let couponCode: string | null = null;
  let couponError: string | undefined;
  const code = coupon?.trim().toUpperCase();
  if (code) {
    const discount = await prisma.discount.findUnique({ where: { code } });
    const r = resolveCoupon(discount, subtotal);
    if (r.ok) {
      discountCents = r.amountCents;
      couponCode = r.code;
    } else couponError = r.reason;
  }
  return { lines, totals: computeOrderTotals(subtotal, discountCents, rules), couponCode, couponError };
}

export async function placeOrderAction(input: unknown): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { email, items, couponCode, shipping } = parsed.data;

  const session = await auth();
  const userId = session?.user?.id ?? null;

  // Merge duplicate lines
  const wanted = new Map<string, number>();
  for (const i of items) wanted.set(i.productId, (wanted.get(i.productId) ?? 0) + i.quantity);

  try {
    const order = await prisma.$transaction(async (tx) => {
      const settings = await tx.storeSettings.findUnique({ where: { id: "store" } });
      const rules = settings
        ? {
            shippingFlatCents: settings.shippingFlatCents,
            freeShippingOverCents: settings.freeShippingOverCents,
            taxPercent: settings.taxPercent,
          }
        : DEFAULT_RULES;

      const products = await tx.product.findMany({ where: { id: { in: [...wanted.keys()] } } });
      const byId = new Map(products.map((p) => [p.id, p]));
      let subtotal = 0;
      const lines: { productId: string; name: string; priceCents: number; quantity: number }[] = [];

      for (const [productId, quantity] of wanted) {
        const p = byId.get(productId);
        if (!p || p.status !== "ACTIVE") throw new CheckoutError("An item in your cart is no longer available");
        if (quantity > MAX_QTY_PER_ITEM) throw new CheckoutError(`Maximum ${MAX_QTY_PER_ITEM} of "${p.name}" per order`);
        // Conditional decrement: atomically prevents overselling
        const res = await tx.product.updateMany({
          where: { id: productId, stock: { gte: quantity } },
          data: { stock: { decrement: quantity } },
        });
        if (res.count === 0) throw new CheckoutError(`Not enough stock for "${p.name}"`);
        await tx.stockMovement.create({ data: { productId, delta: -quantity, reason: "order" } });
        subtotal += p.priceCents * quantity;
        lines.push({ productId, name: p.name, priceCents: p.priceCents, quantity });
      }

      let discountCents = 0;
      let appliedCode: string | null = null;
      if (couponCode) {
        const discount = await tx.discount.findUnique({ where: { code: couponCode } });
        if (!discount) throw new CheckoutError("Invalid coupon code");
        const r = applyDiscount(discount, subtotal);
        if (!r.ok) throw new CheckoutError(r.reason);
        // Atomic usage-limit enforcement
        const claimed = await tx.discount.updateMany({
          where:
            discount.usageLimit === null
              ? { id: discount.id }
              : { id: discount.id, usedCount: { lt: discount.usageLimit } },
          data: { usedCount: { increment: 1 } },
        });
        if (claimed.count === 0) throw new CheckoutError("This coupon has reached its usage limit");
        discountCents = r.amountCents;
        appliedCode = discount.code;
      }

      const totals = computeOrderTotals(subtotal, discountCents, rules);
      const addr = [shipping.line1, shipping.line2, shipping.city, shipping.state, shipping.postalCode, shipping.country]
        .filter(Boolean)
        .join(", ");

      return tx.order.create({
        data: {
          userId,
          email,
          status: "PENDING",
          paymentStatus: "UNPAID",
          ...totals,
          couponCode: appliedCode,
          shippingName: shipping.fullName,
          shippingAddress: shipping.phone ? `${addr} (${shipping.phone})` : addr,
          items: { create: lines },
        },
      });
    });
    return { ok: true, orderId: order.id, number: order.number };
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, error: e.message };
    console.error("placeOrder failed", e);
    return { ok: false, error: "Could not place your order. Please try again." };
  }
}
