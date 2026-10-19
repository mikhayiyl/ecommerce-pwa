"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/guards";
import {
  ORDER_STATUSES,
  canTransition,
  paymentStatusFor,
  restocksOnTransition,
} from "@/features/orders/status";
import { releaseOrderReservation } from "@/features/orders/release";

export type OrderState = { error?: string; success?: string };

export async function updateOrderStatusAction(
  orderId: string,
  _prev: OrderState,
  formData: FormData,
): Promise<OrderState> {
  await requireAdmin();
  const parsed = z.enum(ORDER_STATUSES).safeParse(formData.get("status"));
  if (!parsed.success) return { error: "Invalid status" };
  const to = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new Error("Order not found");
      if (!canTransition(order.status, to)) {
        throw new Error(`Cannot change from ${order.status} to ${to}`);
      }
      const updated = await tx.order.updateMany({
        where: {
          id: orderId,
          status: order.status,
          paymentStatus: order.paymentStatus,
          releasedAt: order.releasedAt,
        },
        data: {
          status: to,
          paymentStatus: paymentStatusFor(to, order.paymentStatus),
          ...(to === "PAID" ? { paidAt: order.paidAt ?? new Date() } : {}),
        },
      });

      if (updated.count === 0) {
        throw new Error(
          "Order changed while you were updating it. Refresh and try again.",
        );
      }
      // Stock is reserved when the order is placed, so even a cancelled PENDING order gives it back.
      if (restocksOnTransition(to, order.status)) {
        await releaseOrderReservation(tx, orderId, to.toLowerCase());
      }
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Update failed" };
  }
  revalidatePath("/admin", "layout");
  return { success: "Order updated" };
}
