"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/security/client-ip";
import { rateLimit } from "@/lib/security/rate-limit";
import { checkoutSchema } from "@/lib/validations/checkout";
import { applyDiscount } from "@/lib/validations/discount";
import { computeOrderTotals, resolveCoupon, DEFAULT_RULES, type OrderTotals, type ShippingRules } from "@/features/checkout/pricing";
import { getCartDetails, type CartLine } from "@/actions/cart";
import { MAX_QTY_PER_ITEM } from "@/features/cart/pricing";
import { holdUntil } from "@/features/orders/release";
import { availableMethods, type PaymentMethod } from "@/features/payments/methods";

export type PlaceOrderResult = { ok: true; orderId: string; number: number } | { ok: false; error: string };

class CheckoutError extends Error {}

export type Quote = {
  lines: CartLine[];
  totals: OrderTotals;
  currency: string;
  methods: PaymentMethod[];
  couponCode: string | null;
  couponError?: string;
};

type Settings = { currency: string; rules: ShippingRules };

function toSettings(s: { currency: string; shippingFlatCents: number; freeShippingOverCents: number; taxPercent: number } | null): Settings {
  return s
    ? {
        currency: s.currency.toLowerCase(),
        rules: { shippingFlatCents: s.shippingFlatCents, freeShippingOverCents: s.freeShippingOverCents, taxPercent: s.taxPercent },
      }
    : { currency: "usd", rules: DEFAULT_RULES };
}

/** Server-calculated preview of the order; the real order is re-validated in placeOrderAction. */
export async function getQuoteAction(items: unknown, coupon?: string): Promise<Quote> {
  const ip = await clientIp();
  const code = coupon?.trim().toUpperCase();
  // Coupon lookups get their own, tighter limit so codes cannot be guessed by hammering the quote.
  const allowed = rateLimit(`quote:${ip}`, 60) && (!code || rateLimit(`coupon:${ip}`, 12));

  const { lines } = await getCartDetails(items);
  const subtotal = lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
  const { currency, rules } = toSettings(await prisma.storeSettings.findUnique({ where: { id: "store" } }));

  let discountCents = 0;
  let couponCode: string | null = null;
  let couponError: string | undefined;
  if (code) {
    if (!allowed) {
      couponError = "Too many coupon attempts. Please wait a minute.";
    } else {
      const discount = await prisma.discount.findUnique({ where: { code } });
      const r = resolveCoupon(discount, subtotal);
      if (r.ok) {
        discountCents = r.amountCents;
        couponCode = r.code;
      } else couponError = r.reason;
    }
  }
  return {
    lines,
    totals: computeOrderTotals(subtotal, discountCents, rules),
    currency,
    methods: availableMethods(currency),
    couponCode,
    couponError,
  };
}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: unknown }).code === "P2002";
}

export async function placeOrderAction(input: unknown): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { items, couponCode, shipping, idempotencyKey, expectedTotalCents } = parsed.data;

  const session = await auth();
  const userId = session?.user?.id ?? null;
  // A signed-in customer's order always carries their account email, whatever the browser sent.
  const email = session?.user?.email?.toLowerCase() ?? parsed.data.email;

  const ip = await clientIp();
  if (!rateLimit(`order:${ip}`, 10) || (userId && !rateLimit(`order-user:${userId}`, 10))) {
    return { ok: false, error: "Too many attempts. Please wait a minute and try again." };
  }

  // A retried request (double click, flaky network) gets the order it already created.
  const existing = await prisma.order.findUnique({ where: { idempotencyKey } });
  if (existing) return existing.userId && existing.userId !== userId ? { ok: false, error: "Could not place your order." } : { ok: true, orderId: existing.id, number: existing.number };

  // Merge duplicate lines; ordered so concurrent checkouts lock products in the same order.
  const merged = new Map<string, number>();
  for (const i of items) merged.set(i.productId, (merged.get(i.productId) ?? 0) + i.quantity);
  const wanted = new Map([...merged].sort(([a], [b]) => a.localeCompare(b)));

  try {
    const order = await prisma.$transaction(async (tx) => {
      const { currency, rules } = toSettings(await tx.storeSettings.findUnique({ where: { id: "store" } }));

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
      if (expectedTotalCents !== undefined && expectedTotalCents !== totals.totalCents) {
        // Rolls everything back, including the stock and coupon claims above.
        throw new CheckoutError("Prices or shipping changed while you were checking out. Please review the new total.");
      }
      const free = totals.totalCents === 0;
      const addr = [shipping.line1, shipping.line2, shipping.city, shipping.state, shipping.postalCode, shipping.country]
        .filter(Boolean)
        .join(", ");

      return tx.order.create({
        data: {
          userId,
          email,
          // An order made free by a coupon needs no payment step.
          status: free ? "PAID" : "PENDING",
          paymentStatus: free ? "PAID" : "UNPAID",
          paidAt: free ? new Date() : null,
          ...totals,
          currency,
          couponCode: appliedCode,
          shippingName: shipping.fullName,
          shippingAddress: addr,
          shippingPhone: shipping.phone ?? null,
          idempotencyKey,
          // Stock is held while the customer pays; the expiry sweep gives it back if they never do.
          expiresAt: free ? null : holdUntil(new Date()),
          items: { create: lines },
        },
      });
    });
    return { ok: true, orderId: order.id, number: order.number };
  } catch (e) {
    if (e instanceof CheckoutError) return { ok: false, error: e.message };
    if (isUniqueViolation(e)) {
      // Two requests with the same key raced; the loser returns the winner's order.
      const winner = await prisma.order.findUnique({ where: { idempotencyKey } });
      if (winner && (!winner.userId || winner.userId === userId)) return { ok: true, orderId: winner.id, number: winner.number };
    }
    console.error("placeOrder failed", e);
    return { ok: false, error: "Could not place your order. Please try again." };
  }
}
