import { prisma } from "@/lib/prisma";
import { averageRating } from "@/lib/validations/review";

export async function recomputeProductRating(productId: string) {
  const reviews = await prisma.review.findMany({
    where: { productId, hidden: false },
    select: { rating: true },
  });
  await prisma.product.update({
    where: { id: productId },
    data: { rating: averageRating(reviews.map((r) => r.rating)) },
  });
}
