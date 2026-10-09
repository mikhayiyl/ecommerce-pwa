import { connection } from "next/server";
import WishlistToggle from "@/components/products/WishlistToggle";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function WishlistButton({ productId, slug }: { productId: string; slug: string }) {
  await connection();
  const session = await auth();
  const userId = session?.user?.id;
  const saved = userId
    ? !!(await prisma.wishlistItem.findUnique({ where: { userId_productId: { userId, productId } }, select: { id: true } }))
    : false;
  return (
    <WishlistToggle
      productId={productId}
      initial={saved}
      loginHref={`/login?callbackUrl=${encodeURIComponent(`/products/${slug}`)}`}
    />
  );
}
