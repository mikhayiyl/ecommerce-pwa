"use server";

import { z } from "zod";
import { mergeCarts, type CartEntry } from "@/features/cart/merge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const entriesSchema = z
  .array(z.object({ productId: z.string().min(1), quantity: z.number().int().min(1).max(1000) }))
  .max(100);

async function stockMap(ids: string[]) {
  const products = await prisma.product.findMany({
    where: { id: { in: ids }, status: "ACTIVE" },
    select: { id: true, stock: true },
  });
  return new Map(products.map((p) => [p.id, p.stock]));
}

async function replaceServerCart(userId: string, items: CartEntry[]) {
  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { userId } }),
    prisma.cartItem.createMany({ data: items.map((i) => ({ userId, ...i })) }),
  ]);
}

// Merges the device cart into the account cart on login; returns the result, or null for guests.
export async function syncCartAction(local: CartEntry[]): Promise<CartEntry[] | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  const parsed = entriesSchema.safeParse(local);
  const localItems = parsed.success ? parsed.data : [];

  const server = await prisma.cartItem.findMany({ where: { userId }, select: { productId: true, quantity: true } });
  const stock = await stockMap([...new Set([...server, ...localItems].map((i) => i.productId))]);
  const merged = mergeCarts(server, localItems, stock);
  await replaceServerCart(userId, merged);
  return merged;
}

// Persists later cart edits for signed-in users. Quantities are re-capped against stock.
export async function saveCartAction(items: CartEntry[]): Promise<void> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;
  const parsed = entriesSchema.safeParse(items);
  if (!parsed.success) return;
  const stock = await stockMap(parsed.data.map((i) => i.productId));
  await replaceServerCart(userId, mergeCarts(parsed.data, [], stock));
}
