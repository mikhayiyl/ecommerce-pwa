import { prisma } from "@/lib/prisma";

export const REVENUE_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export async function getOverview() {
  const [revenue, orderCount, customerCount, products, recent] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { in: [...REVENUE_STATUSES] } },
      _sum: { totalCents: true },
      _count: true,
    }),
    prisma.order.count(),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, stock: true, lowStockThreshold: true },
      orderBy: { stock: "asc" },
      take: 50,
    }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const revenueCents = revenue._sum.totalCents ?? 0;
  return {
    revenueCents,
    orderCount,
    customerCount,
    averageOrderCents: revenue._count ? Math.round(revenueCents / revenue._count) : 0,
    lowStock: products.filter((p) => p.stock <= p.lowStockThreshold).slice(0, 8),
    recent,
  };
}
