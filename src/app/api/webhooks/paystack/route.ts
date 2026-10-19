import { verifyPaystackSignature } from "@/features/payments/paystack";
import { settleAttemptSuccess } from "@/features/payments/settle";

// Set this URL as the webhook in the Paystack dashboard: <site>/api/webhooks/paystack
export async function POST(request: Request) {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) return new Response("Not configured", { status: 503 });

  const raw = await request.text();
  if (
    !verifyPaystackSignature(
      raw,
      request.headers.get("x-paystack-signature"),
      key,
    )
  ) {
    return new Response("Invalid signature", { status: 401 });
  }

  let event: {
    event?: string;
    data?: {
      reference?: unknown;
      amount?: unknown;
      currency?: unknown;
      status?: unknown;
      id?: unknown;
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const data = event.data;

  if (
    event.event === "charge.success" &&
    data?.status === "success" &&
    typeof data.reference === "string" &&
    data.reference.trim().length > 0 &&
    typeof data.amount === "number" &&
    Number.isSafeInteger(data.amount) &&
    data.amount >= 0 &&
    typeof data.currency === "string" &&
    data.currency.trim().length > 0
  ) {
    const result = await settleAttemptSuccess({
      reference: data.reference,
      amountCents: data.amount,
      currency: data.currency,
      receipt: data.id != null ? String(data.id) : null,
    });

    if (!result.ok) {
      console.warn("paystack webhook ignored:", result.reason);
    }
  }

  return new Response("ok");
}
