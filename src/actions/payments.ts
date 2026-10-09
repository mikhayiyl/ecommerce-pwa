"use server";

import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/site";
import { clientIp } from "@/lib/security/client-ip";
import { rateLimit } from "@/lib/security/rate-limit";
import { PAYMENT_GRACE_MINUTES, holdUntil } from "@/features/orders/release";
import { PaymentProviderError } from "@/features/payments/errors";
import { availableMethods, chargeCents, mpesaWholeAmount } from "@/features/payments/methods";
import { normalizeKenyanPhone, stkPush, stkQuery } from "@/features/payments/mpesa";
import { initializePaystack, verifyPaystack } from "@/features/payments/paystack";
import { settleAttemptFailure, settleAttemptSuccess } from "@/features/payments/settle";

export type StartPaymentResult =
  | { ok: true; kind: "redirect"; url: string }
  | { ok: true; kind: "prompt"; message: string }
  | { ok: false; error: string };

const startSchema = z.object({
  orderId: z.string().min(1).max(40),
  method: z.enum(["PAYSTACK", "MPESA"]),
  phone: z.string().trim().max(30).optional(),
});

/** Guests hold the unguessable order id; orders that belong to an account are only payable by that account. */
async function loadPayableOrder(orderId: string) {
  const session = await auth();
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return null;
  if (order.userId && order.userId !== session?.user?.id) return null;
  return order;
}

async function extendHold(orderId: string, now: Date) {
  const until = holdUntil(now, PAYMENT_GRACE_MINUTES);
  // Never shortens the hold; orders without an expiry (placed before expiry existed) are left alone.
  await prisma.order.updateMany({
    where: { id: orderId, status: "PENDING", expiresAt: { lt: until } },
    data: { expiresAt: until },
  });
}

export async function startPaymentAction(input: unknown): Promise<StartPaymentResult> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid payment request" };
  const { orderId, method, phone } = parsed.data;

  const ip = await clientIp();
  if (!rateLimit(`pay:${ip}`, 15) || !rateLimit(`pay-order:${orderId}`, 8)) {
    return { ok: false, error: "Too many attempts. Please wait a minute and try again." };
  }

  const order = await loadPayableOrder(orderId);
  if (!order) return { ok: false, error: "Order not found" };
  const now = new Date();
  if (order.status !== "PENDING" || order.paymentStatus === "PAID") {
    return { ok: false, error: "This order can no longer be paid" };
  }
  if (order.expiresAt && order.expiresAt <= now) {
    return { ok: false, error: "This order expired and its items were released. Please place a new order." };
  }
  if (!availableMethods(order.currency).includes(method)) {
    return { ok: false, error: "That payment method is not available for this order" };
  }

  const currency = order.currency.toUpperCase();

  if (method === "PAYSTACK") {
    const reference = `${order.id}-${randomBytes(4).toString("hex")}`;
    await prisma.paymentAttempt.create({
      data: { orderId: order.id, provider: "PAYSTACK", reference, amountCents: chargeCents("PAYSTACK", order.totalCents), currency },
    });
    try {
      const { authorizationUrl } = await initializePaystack({
        email: order.email,
        amountCents: order.totalCents,
        currency,
        reference,
        orderId: order.id,
        callbackUrl: `${siteUrl()}/checkout/success?order=${order.id}`,
        cancelUrl: `${siteUrl()}/checkout/cancel?order=${order.id}`,
      });
      await extendHold(order.id, now);
      return { ok: true, kind: "redirect", url: authorizationUrl };
    } catch (e) {
      await settleAttemptFailure(reference, "Could not start the payment");
      return { ok: false, error: e instanceof PaymentProviderError ? e.message : "Could not start the payment. Please try again." };
    }
  }

  // M-Pesa
  const msisdn = normalizeKenyanPhone(phone ?? "");
  if (!msisdn) return { ok: false, error: "Enter a valid Safaricom number, for example 0712 345 678" };

  const recent = await prisma.paymentAttempt.findFirst({
    where: { orderId: order.id, provider: "MPESA", status: "PENDING", createdAt: { gt: new Date(now.getTime() - 90_000) } },
  });
  if (recent) {
    return { ok: false, error: "We already sent an M-Pesa prompt to your phone. Wait a minute before asking for another." };
  }

  // Safaricom only tells us the real reference (CheckoutRequestID) after the prompt is sent.
  const placeholder = `pending-${randomUUID()}`;
  const attempt = await prisma.paymentAttempt.create({
    data: { orderId: order.id, provider: "MPESA", reference: placeholder, amountCents: chargeCents("MPESA", order.totalCents), currency },
  });
  try {
    const { checkoutRequestId } = await stkPush({
      phone: msisdn,
      amountWhole: mpesaWholeAmount(order.totalCents),
      accountReference: `ORD${order.number}`,
    });
    await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { reference: checkoutRequestId } });
    await extendHold(order.id, now);
    return { ok: true, kind: "prompt", message: "Check your phone and enter your M-Pesa PIN to complete the payment." };
  } catch (e) {
    await settleAttemptFailure(placeholder, "Could not send the M-Pesa prompt");
    return { ok: false, error: e instanceof PaymentProviderError ? e.message : "Could not send the M-Pesa prompt. Please try again." };
  }
}

export type PaymentState = {
  orderStatus: string;
  paid: boolean;
  /** A payment is in flight (card page open or M-Pesa prompt sent), so keep polling. */
  waiting: boolean;
  failed: boolean;
  message?: string;
};

const UNKNOWN: PaymentState = { orderStatus: "UNKNOWN", paid: false, waiting: false, failed: false };

/**
 * Polled by the order page while a payment is in flight. Webhooks are the normal way a payment is
 * confirmed; this asks the provider directly so a missed or delayed webhook never strands a customer.
 */
export async function refreshPaymentAction(orderId: unknown): Promise<PaymentState> {
  if (typeof orderId !== "string" || orderId.length === 0 || orderId.length > 40) return UNKNOWN;
  if (!rateLimit(`pay-poll:${await clientIp()}`, 90)) return { ...UNKNOWN, waiting: true };

  let order = await loadPayableOrder(orderId);
  if (!order) return UNKNOWN;

  if (order.paymentStatus !== "PAID") {
    const attempt = await prisma.paymentAttempt.findFirst({
      where: { orderId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    if (attempt) {
      const ageMs = Date.now() - attempt.createdAt.getTime();
      try {
        if (attempt.provider === "PAYSTACK") {
          const v = await verifyPaystack(attempt.reference);
          if (v.state === "success") {
            const r = await settleAttemptSuccess({ reference: attempt.reference, amountCents: v.amountCents, currency: v.currency, receipt: v.receipt });
            if (!r.ok) console.error("paystack verify rejected", r.reason);
          } else if (v.state === "failed") {
            await settleAttemptFailure(attempt.reference, "The payment was declined");
          }
        } else if (attempt.reference.startsWith("pending-")) {
          // The prompt request never returned a CheckoutRequestID, so nothing can arrive for it.
          if (ageMs > 120_000) await settleAttemptFailure(attempt.reference, "The M-Pesa prompt was not sent");
        } else if (ageMs > 60_000) {
          // The callback normally lands within seconds; after a minute, ask Safaricom ourselves.
          const q = await stkQuery(attempt.reference);
          if (q.state === "success") {
            await settleAttemptSuccess({ reference: attempt.reference, amountCents: attempt.amountCents, currency: attempt.currency, receipt: null });
          } else if (q.state === "failed") {
            await settleAttemptFailure(attempt.reference, q.reason || "The M-Pesa payment was not completed");
          }
        }
      } catch (e) {
        console.error("payment refresh failed", e); // provider hiccup: keep waiting
      }
      order = (await prisma.order.findUnique({ where: { id: orderId } })) ?? order;
    }
  }

  const latest = await prisma.paymentAttempt.findFirst({ where: { orderId }, orderBy: { createdAt: "desc" } });
  const paid = order.paymentStatus === "PAID";
  const waiting = !paid && latest?.status === "PENDING";
  return {
    orderStatus: order.status,
    paid,
    waiting,
    failed: !paid && !waiting && latest?.status === "FAILED",
    message: !paid && latest?.status === "FAILED" ? (latest.failureReason ?? undefined) : undefined,
  };
}
