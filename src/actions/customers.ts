"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/guards";

export async function setCustomerDisabledAction(userId: string, disabled: boolean) {
  const admin = await requireAdmin();
  if (admin.id === userId) return;
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target || target.role === "ADMIN") return;
  await prisma.user.update({ where: { id: userId }, data: { disabled } });
  revalidatePath("/admin/customers", "layout");
}
