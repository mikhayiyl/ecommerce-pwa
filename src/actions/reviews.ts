"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/security/guards";
import { recomputeProductRating } from "@/features/reviews/rating";
import { reviewSchema } from "@/lib/validations/review";

export type ReviewState = { error?: string; success?: string };

export async function setReviewHiddenAction(reviewId: string, hidden: boolean) {
  await requireAdmin();
  const review = await prisma.review.update({ where: { id: reviewId }, data: { hidden } });
  await recomputeProductRating(review.productId);
  revalidatePath("/", "layout");
}

export async function deleteReviewAction(reviewId: string) {
  await requireAdmin();
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) return;
  await prisma.review.delete({ where: { id: reviewId } });
  await recomputeProductRating(review.productId);
  revalidatePath("/", "layout");
}

export async function submitReviewAction(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const parsed = reviewSchema.safeParse({
    productId: formData.get("productId"),
    rating: formData.get("rating"),
    comment: formData.get("comment"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { productId, rating, comment } = parsed.data;

  const product = await prisma.product.findFirst({ where: { id: productId, status: "ACTIVE" }, select: { slug: true } });
  if (!product) return { error: "Product not found" };
  const user = await requireUser(`/products/${product.slug}`);

  await prisma.review.upsert({
    where: { productId_userId: { productId, userId: user.id } },
    create: { productId, userId: user.id, rating, comment },
    update: { rating, comment },
  });
  await recomputeProductRating(productId);
  revalidatePath(`/products/${product.slug}`);
  return { success: "Thanks! Your review has been saved." };
}
