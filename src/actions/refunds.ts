"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/guards";

export type RefundState = { error?: string; success?: string };

export async function markRefundProcessedAction(
  paymentAttemptId: string,
  _prev: RefundState,
  formData: FormData,
): Promise<RefundState> {
  const admin = await requireAdmin();

  const parsed = z
    .object({
      confirm: z.literal("on"),
    })
    .safeParse({
      confirm: formData.get("confirm"),
    });

  if (!parsed.success) {
    return {
      error: "Confirm that the refund was processed with the payment provider.",
    };
  }

  const idParsed = z.string().cuid().safeParse(paymentAttemptId);
  if (!idParsed.success) return { error: "Invalid payment attempt" };

  const attempt = await prisma.paymentAttempt.findUnique({
    where: { id: idParsed.data },
    select: { id: true, orderId: true, refundStatus: true },
  });

  if (!attempt) return { error: "Payment attempt not found" };

  if (attempt.refundStatus !== "PENDING") {
    return {
      error:
        "This refund is no longer pending. Refresh the page to see its current status.",
    };
  }

  const updated = await prisma.paymentAttempt.updateMany({
    where: {
      id: attempt.id,
      refundStatus: "PENDING",
    },

    data: {
      refundStatus: "REFUNDED",
      refundedAt: new Date(),
      refundedById: admin.id,
    },
  });

  if (updated.count === 0) {
    return {
      error: "This refund was already updated. Refresh the page.",
    };
  }

  revalidatePath(`/admin/orders/${attempt.orderId}`);
  revalidatePath("/admin/orders");
  return { success: "Refund marked as processed." };
}
