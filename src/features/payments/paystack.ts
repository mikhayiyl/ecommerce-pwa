import { createHmac } from "node:crypto";
import { safeEqual } from "@/lib/security/safe-equal";
import { PaymentProviderError } from "@/features/payments/errors";

const BASE = "https://api.paystack.co";

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new PaymentProviderError("Card payments are not available right now");
  return key;
}

async function paystack(path: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json", ...init?.headers },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch (e) {
    if (e instanceof PaymentProviderError) throw e;
    throw new PaymentProviderError("Could not reach the payment provider. Please try again.");
  }
  const json = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: Record<string, unknown> } | null;
  return { res, json };
}

/** Starts a hosted Paystack payment and returns the page to send the customer to. */
export async function initializePaystack(input: {
  email: string;
  amountCents: number;
  currency: string;
  reference: string;
  orderId: string;
  callbackUrl: string;
  cancelUrl: string;
}): Promise<{ authorizationUrl: string }> {
  const { res, json } = await paystack("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountCents,
      currency: input.currency.toUpperCase(),
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: { order_id: input.orderId, cancel_action: input.cancelUrl },
    }),
  });
  const url = json?.data?.authorization_url;
  if (!res.ok || !json?.status || typeof url !== "string") {
    console.error("paystack initialize failed", res.status, json?.message);
    throw new PaymentProviderError("Could not start the payment. Please try again.");
  }
  return { authorizationUrl: url };
}

export type PaystackVerification = {
  state: "success" | "failed" | "pending";
  amountCents: number;
  currency: string;
  receipt: string | null;
};

/** Asks Paystack directly what happened to a reference; the redirect alone is never trusted. */
export async function verifyPaystack(reference: string): Promise<PaystackVerification> {
  const { res, json } = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
  const data = json?.data;
  if (!res.ok || !json?.status || !data) {
    // Paystack answers 400 "Transaction reference not found" until the customer actually opens the page.
    return { state: "pending", amountCents: 0, currency: "", receipt: null };
  }
  const status = String(data.status);
  return {
    state: status === "success" ? "success" : status === "failed" || status === "reversed" ? "failed" : "pending",
    amountCents: Number(data.amount) || 0,
    currency: String(data.currency ?? ""),
    receipt: data.id != null ? String(data.id) : null,
  };
}

/** Webhooks are signed with HMAC-SHA512 of the raw body using the secret key. */
export function verifyPaystackSignature(rawBody: string, signature: string | null, key: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha512", key).update(rawBody).digest("hex");
  return safeEqual(expected, signature.trim().toLowerCase());
}
