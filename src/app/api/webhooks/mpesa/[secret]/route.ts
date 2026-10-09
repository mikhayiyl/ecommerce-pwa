import { parseStkCallback } from "@/features/payments/mpesa";
import { settleAttemptFailure, settleAttemptSuccess } from "@/features/payments/settle";
import { safeEqual } from "@/lib/security/safe-equal";

// Safaricom does not sign callbacks, so the URL carries a secret (MPESA_CALLBACK_SECRET). The payment is
// still only accepted if the CheckoutRequestID matches an attempt we created and the amount matches.
const ACK = { ResultCode: 0, ResultDesc: "Accepted" };

export async function POST(request: Request, ctx: { params: Promise<{ secret: string }> }) {
  const expected = process.env.MPESA_CALLBACK_SECRET;
  const { secret } = await ctx.params;
  if (!expected || !safeEqual(secret, expected)) return new Response("Not found", { status: 404 });

  const body = await request.json().catch(() => null);
  const cb = parseStkCallback(body);
  if (!cb) return Response.json(ACK);

  if (cb.resultCode === 0) {
    if (cb.amount === null) {
      console.warn("mpesa callback without amount", cb.checkoutRequestId);
      return Response.json(ACK);
    }
    const result = await settleAttemptSuccess({
      reference: cb.checkoutRequestId,
      amountCents: Math.round(cb.amount * 100),
      currency: "KES",
      receipt: cb.receipt,
    });
    if (!result.ok) console.warn("mpesa callback ignored:", result.reason);
  } else {
    await settleAttemptFailure(cb.checkoutRequestId, cb.resultDesc || "The M-Pesa payment was not completed");
  }
  return Response.json(ACK);
}
