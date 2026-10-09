import { cacheLife } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, type ProductQuery } from "@/lib/validations/product";

export async function getProducts(query: ProductQuery) {
  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    ...(query.q && {
      OR: [
        { name: { contains: query.q, mode: "insensitive" } },
        { brand: { contains: query.q, mode: "insensitive" } },
        { description: { contains: query.q, mode: "insensitive" } },
        { category: { name: { contains: query.q, mode: "insensitive" } } },
      ],
    }),
    ...(query.category && { category: { slug: query.category } }),
    ...((query.min !== undefined || query.max !== undefined) && {
      priceCents: {
        ...(query.min !== undefined && { gte: Math.round(query.min * 100) }),
        ...(query.max !== undefined && { lte: Math.round(query.max * 100) }),
      },
    }),
    ...(query.rating && { rating: { gte: query.rating } }),
    ...(query.inStock && { stock: { gt: 0 } }),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    query.sort === "price-asc"
      ? { priceCents: "asc" }
      : query.sort === "price-desc"
        ? { priceCents: "desc" }
        : query.sort === "rating"
          ? { rating: "desc" }
          : { createdAt: "desc" };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [orderBy, { id: "asc" }],
      skip: (query.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { category: { select: { name: true, slug: true } } },
    }),
    prisma.product.count({ where }),
  ]);

  return { products, total, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function getProductBySlug(slug: string) {
  "use cache";
  cacheLife("minutes");
  return prisma.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: { category: { select: { name: true, slug: true } } },
  });
}

export async function getCategoryBySlug(slug: string) {
  "use cache";
  cacheLife("hours");
  return prisma.category.findUnique({ where: { slug } });
}

export async function getRelatedProducts(categoryId: string, excludeId: string, take = 4) {
  "use cache";
  cacheLife("minutes");
  return prisma.product.findMany({
    where: { categoryId, status: "ACTIVE", id: { not: excludeId } },
    orderBy: { rating: "desc" },
    take,
    include: { category: { select: { name: true, slug: true } } },
  });
}

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
