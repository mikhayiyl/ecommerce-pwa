"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/guards";

export type InventoryState = { error?: string; success?: string };

const adjustSchema = z.object({
  delta: z.coerce.number().int("Whole numbers only").refine((n) => n !== 0, "Adjustment cannot be 0").refine((n) => Math.abs(n) <= 100_000, "Too large"),
  reason: z.string().trim().min(2, "Give a reason").max(200),
  lowStockThreshold: z.coerce.number().int().min(0).max(100_000).optional().catch(undefined),
});

export async function adjustStockAction(
  productId: string,
  _prev: InventoryState,
  formData: FormData,
): Promise<InventoryState> {
  await requireAdmin();
  const parsed = adjustSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { delta, reason } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId }, select: { stock: true } });
      if (!product) throw new Error("Product not found");
      if (product.stock + delta < 0) throw new Error("Stock cannot go below zero");
      await tx.product.update({ where: { id: productId }, data: { stock: { increment: delta } } });
      await tx.stockMovement.create({ data: { productId, delta, reason } });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not adjust stock" };
  }
  revalidatePath("/", "layout");
  return { success: "Stock updated" };
}

export async function setThresholdAction(
  productId: string,
  _prev: InventoryState,
  formData: FormData,
): Promise<InventoryState> {
  await requireAdmin();
  const parsed = z.coerce.number().int().min(0).max(100_000).safeParse(formData.get("threshold"));
  if (!parsed.success) return { error: "Enter a whole number ≥ 0" };
  await prisma.product.update({ where: { id: productId }, data: { lowStockThreshold: parsed.data } });
  revalidatePath("/admin", "layout");
  return { success: "Threshold saved" };
}
