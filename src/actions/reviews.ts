"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/guards";

export async function setReviewHiddenAction(reviewId: string, hidden: boolean) {
  await requireAdmin();
  await prisma.review.updateMany({ where: { id: reviewId }, data: { hidden } });
  revalidatePath("/", "layout");
}

export async function deleteReviewAction(reviewId: string) {
  await requireAdmin();
  await prisma.review.deleteMany({ where: { id: reviewId } });
  revalidatePath("/", "layout");
}
