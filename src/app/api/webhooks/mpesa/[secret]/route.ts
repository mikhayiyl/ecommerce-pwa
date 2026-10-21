import { prisma } from "@/lib/prisma";
import { parseStkCallback } from "@/features/payments/mpesa";
import {
  settleAttemptFailure,
  settleAttemptSuccess,
} from "@/features/payments/settle";
import { safeEqual } from "@/lib/security/safe-equal";
import type { Prisma } from "@/generated/prisma/client";

// Safaricom does not sign callbacks, so the URL carries a secret.
// Payment settlement still validates the attempt and amount.
const ACK = { ResultCode: 0, ResultDesc: "Accepted" };

export async function POST(
  request: Request,
  ctx: { params: Promise<{ secret: string }> },
) {
  const expected = process.env.MPESA_CALLBACK_SECRET;
  const { secret } = await ctx.params;

  if (!expected || !safeEqual(secret, expected)) {
    return new Response("Not found", { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  const cb = parseStkCallback(body);

  if (!cb) return Response.json(ACK);

  const amountCents = cb.amount === null ? null : Math.round(cb.amount * 100);

  // Keep only the callback fields needed for financial investigation.
  const evidence = {
    checkoutRequestId: cb.checkoutRequestId,
    merchantRequestId: cb.merchantRequestId,
    resultCode: cb.resultCode,
    resultDesc: cb.resultDesc,
    amount: cb.amount,
    receipt: cb.receipt,
  };

  // Create the evidence once. Duplicate deliveries must not overwrite it.
  await prisma.mpesaCallback.upsert({
    where: {
      checkoutRequestId_resultCode: {
        checkoutRequestId: cb.checkoutRequestId,
        resultCode: cb.resultCode,
      },
    },
    create: {
      checkoutRequestId: cb.checkoutRequestId,
      merchantRequestId: cb.merchantRequestId,
      resultCode: cb.resultCode,
      resultDesc: cb.resultDesc,
      amountCents,
      receipt: cb.receipt,
      rawPayload: evidence as Prisma.InputJsonValue,
      status: "UNMATCHED",
    },
    update: {},
  });

  if (cb.resultCode === 0) {
    if (amountCents === null || amountCents <= 0) {
      console.warn(
        "M-Pesa successful callback has missing or invalid amount",
        cb.checkoutRequestId,
      );
      return Response.json(ACK);
    }

    const result = await settleAttemptSuccess({
      reference: cb.checkoutRequestId,
      amountCents,
      currency: "KES",
      receipt: cb.receipt,
    });

    if (result.ok) {
      await prisma.mpesaCallback.update({
        where: {
          checkoutRequestId_resultCode: {
            checkoutRequestId: cb.checkoutRequestId,
            resultCode: cb.resultCode,
          },
        },
        data: {
          status: "RECONCILED",
          reconciledAt: new Date(),
        },
      });
    } else {
      console.warn(
        "M-Pesa callback requires reconciliation:",
        result.reason,
        cb.checkoutRequestId,
      );
    }
  } else {
    // settleAttemptFailure returns void, so we cannot prove that an
    // existing attempt was updated. Leave the callback for reconciliation.
    await settleAttemptFailure(
      cb.checkoutRequestId,
      cb.resultDesc || "The M-Pesa payment was not completed",
    );
  }

  return Response.json(ACK);
}
