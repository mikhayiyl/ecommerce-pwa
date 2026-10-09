import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import ProductGrid from "@/components/products/ProductGrid";
import { requireUser } from "@/lib/security/guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Wishlist" };

async function Content() {
  const user = await requireUser("/wishlist");
  const items = await prisma.wishlistItem.findMany({
    where: { userId: user.id, product: { status: "ACTIVE" } },
    orderBy: { createdAt: "desc" },
    select: {
      product: {
        select: { slug: true, name: true, priceCents: true, currency: true, imageUrl: true, rating: true, stock: true, category: { select: { name: true } } },
      },
    },
  });

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted">Your wishlist is empty.</p>
        <Link href="/products" className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 font-medium text-background">
          Browse products
        </Link>
      </div>
    );
  }
  return <ProductGrid products={items.map((i) => i.product)} />;
}

export default function WishlistPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Your wishlist</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-surface" />}>
        <Content />
      </Suspense>
    </div>
  );
}
