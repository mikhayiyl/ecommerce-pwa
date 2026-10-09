import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { parseQuery, type ParsedQuery } from "@/lib/ai/parse-query";

export const productSummarySelect = {
  id: true,
  slug: true,
  name: true,
  brand: true,
  priceCents: true,
  currency: true,
  stock: true,
  rating: true,
  imageUrl: true,
  category: { select: { name: true, slug: true } },
} satisfies Prisma.ProductSelect;

export async function naturalLanguageSearch(text: string, take = 8) {
  const categories = await prisma.category.findMany({ select: { name: true, slug: true } });
  const parsed: ParsedQuery = parseQuery(text.slice(0, 300), categories);

  const where: Prisma.ProductWhereInput = {
    status: "ACTIVE",
    ...(parsed.category && { category: { slug: parsed.category } }),
    ...((parsed.min !== undefined || parsed.max !== undefined) && {
      priceCents: {
        ...(parsed.min !== undefined && { gte: Math.round(parsed.min * 100) }),
        ...(parsed.max !== undefined && { lte: Math.round(parsed.max * 100) }),
      },
    }),
    ...(parsed.rating && { rating: { gte: parsed.rating } }),
    ...(parsed.inStock && { stock: { gt: 0 } }),
    AND: parsed.keywords.map((k) => ({
      OR: [
        { name: { contains: k, mode: "insensitive" as const } },
        { brand: { contains: k, mode: "insensitive" as const } },
        { description: { contains: k, mode: "insensitive" as const } },
        { category: { name: { contains: k, mode: "insensitive" as const } } },
      ],
    })),
  };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    parsed.sort === "price-asc" ? { priceCents: "asc" } : parsed.sort === "price-desc" ? { priceCents: "desc" } : { rating: "desc" };

  const products = await prisma.product.findMany({ where, orderBy: [orderBy, { id: "asc" }], take, select: productSummarySelect });
  return { parsed, products };
}
