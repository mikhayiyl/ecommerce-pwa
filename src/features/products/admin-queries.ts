import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const ADMIN_PAGE_SIZE = 15;

export async function getAdminProducts(q?: string, status?: string, page = 1) {
  const where: Prisma.ProductWhereInput = {
    ...(status && { status: status as "DRAFT" | "ACTIVE" | "ARCHIVED" }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { brand: { contains: q, mode: "insensitive" } },
      ],
    }),
  };
  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: { category: { select: { name: true } } },
    }),
    prisma.product.count({ where }),
  ]);
  return { items, total, pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)) };
}
