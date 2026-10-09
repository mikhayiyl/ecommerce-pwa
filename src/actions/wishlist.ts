"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type WishlistResult = { needsLogin?: boolean; wishlisted?: boolean };

export async function toggleWishlistAction(productId: string): Promise<WishlistResult> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { needsLogin: true };

  const key = { userId_productId: { userId, productId } };
  const existing = await prisma.wishlistItem.findUnique({ where: key });
  if (existing) {
    await prisma.wishlistItem.delete({ where: key });
  } else {
    const product = await prisma.product.findFirst({ where: { id: productId, status: "ACTIVE" }, select: { id: true } });
    if (!product) return { wishlisted: false };
    await prisma.wishlistItem.create({ data: { userId, productId } });
  }
  revalidatePath("/wishlist");
  return { wishlisted: !existing };
}
