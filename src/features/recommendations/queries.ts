import { prisma } from "@/lib/prisma";
import { productSummarySelect } from "@/features/products/nl-search";
import { buildSignals, rank } from "./score";

const PAID = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export async function getRecommendations(opts: { userId?: string; viewedIds?: string[]; take?: number }) {
  const take = opts.take ?? 8;
  const viewedIds = (opts.viewedIds ?? []).slice(0, 20);

  const [viewed, wishlist, purchased] = await Promise.all([
    viewedIds.length
      ? prisma.product.findMany({ where: { id: { in: viewedIds } }, select: { id: true, categoryId: true, priceCents: true } })
      : [],
    opts.userId
      ? prisma.wishlistItem.findMany({ where: { userId: opts.userId }, select: { product: { select: { id: true, categoryId: true, priceCents: true } } } })
      : [],
    opts.userId
      ? prisma.orderItem.findMany({
          where: { order: { userId: opts.userId, status: { in: [...PAID] } }, productId: { not: null } },
          select: { product: { select: { id: true, categoryId: true, priceCents: true } } },
          take: 50,
        })
      : [],
  ]);

  const seen = new Set<string>(viewed.map((p) => p.id));
  const signalItems = viewed.map((p) => ({ ...p, weight: 1 }));
  for (const w of wishlist) {
    seen.add(w.product.id);
    signalItems.push({ ...w.product, weight: 2 });
  }
  for (const o of purchased) {
    if (!o.product) continue;
    seen.add(o.product.id);
    signalItems.push({ ...o.product, weight: 3 });
  }

  const personalised = signalItems.length > 0;
  const signals = buildSignals(signalItems);
  const pool = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      stock: { gt: 0 },
      id: { notIn: [...seen] },
      ...(personalised && { categoryId: { in: [...signals.categoryWeights.keys()] } }),
    },
    orderBy: { rating: "desc" },
    take: 60,
    select: { ...productSummarySelect, categoryId: true },
  });
  const products = rank(pool, signals, take);
  return { personalised, products };
}
