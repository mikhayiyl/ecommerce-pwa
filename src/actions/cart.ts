"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { calculateTotals, MAX_QTY_PER_ITEM } from "@/features/cart/pricing";

const cartInput = z
  .array(
    z.object({
      productId: z.string().min(1).max(40),
      quantity: z.number().int().min(1).max(1000),
    }),
  )
  .max(50);

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  requestedQuantity: number;
  stock: number;
  lineTotalCents: number;
};

/** Prices and stock come from the database only; client values are never trusted. */
export async function getCartDetails(input: unknown) {
  const parsed = cartInput.safeParse(input);
  if (!parsed.success) return { lines: [] as CartLine[], unavailable: [] as string[], totals: calculateTotals(0) };

  const items = parsed.data;
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, status: "ACTIVE" },
    select: { id: true, slug: true, name: true, imageUrl: true, priceCents: true, stock: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines: CartLine[] = [];
  const unavailable: string[] = [];
  for (const item of items) {
    const p = byId.get(item.productId);
    if (!p || p.stock === 0) {
      unavailable.push(item.productId);
      continue;
    }
    const quantity = Math.min(item.quantity, p.stock, MAX_QTY_PER_ITEM);
    lines.push({
      productId: p.id,
      slug: p.slug,
      name: p.name,
      imageUrl: p.imageUrl,
      unitPriceCents: p.priceCents,
      quantity,
      requestedQuantity: item.quantity,
      stock: p.stock,
      lineTotalCents: p.priceCents * quantity,
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotalCents, 0);
  return { lines, unavailable, totals: calculateTotals(subtotal) };
}
