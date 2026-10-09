"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/guards";
import { discountInputSchema } from "@/lib/validations/discount";

export type DiscountState = { error?: string; success?: string };

function parse(formData: FormData) {
  return discountInputSchema.safeParse({
    code: formData.get("code"),
    type: formData.get("type"),
    value: formData.get("value"),
    expiresAt: formData.get("expiresAt") || undefined,
    usageLimit: formData.get("usageLimit") || undefined,
    minSubtotal: formData.get("minSubtotal") || 0,
    active: formData.get("active") === "on",
  });
}

export async function createDiscountAction(_prev: DiscountState, formData: FormData): Promise<DiscountState> {
  await requireAdmin();
  const parsed = parse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (await prisma.discount.findUnique({ where: { code: parsed.data.code } })) {
    return { error: "That code already exists" };
  }
  await prisma.discount.create({ data: parsed.data });
  revalidatePath("/admin/discounts");
  return { success: `Created ${parsed.data.code}` };
}

export async function toggleDiscountAction(id: string, active: boolean) {
  await requireAdmin();
  await prisma.discount.updateMany({ where: { id }, data: { active } });
  revalidatePath("/admin/discounts");
}

export async function deleteDiscountAction(id: string) {
  await requireAdmin();
  await prisma.discount.deleteMany({ where: { id } });
  revalidatePath("/admin/discounts");
}
