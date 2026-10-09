import { cacheLife } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function getCategories() {
  "use cache";
  cacheLife("hours");
  return prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: { where: { status: "ACTIVE" } } } } },
  });
}

export async function getFeaturedProducts(take = 8) {
  "use cache";
  cacheLife("hours");
  return prisma.product.findMany({
    where: { status: "ACTIVE", featured: true },
    orderBy: { rating: "desc" },
    take,
    include: { category: { select: { name: true, slug: true } } },
  });
}

export async function getNewArrivals(take = 8) {
  "use cache";
  cacheLife("hours");
  return prisma.product.findMany({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    take,
    include: { category: { select: { name: true, slug: true } } },
  });
}
