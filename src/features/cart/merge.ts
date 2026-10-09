import { MAX_QTY_PER_ITEM } from "./pricing";

export type CartEntry = { productId: string; quantity: number };

// Sums quantities from both carts, then caps each line by available stock.
// Products missing from `stock` (inactive or deleted) are dropped.
export function mergeCarts(
  a: CartEntry[],
  b: CartEntry[],
  stock: Map<string, number>,
): CartEntry[] {
  const totals = new Map<string, number>();
  for (const item of [...a, ...b]) {
    totals.set(item.productId, (totals.get(item.productId) ?? 0) + item.quantity);
  }
  const merged: CartEntry[] = [];
  for (const [productId, qty] of totals) {
    const available = stock.get(productId);
    if (available === undefined) continue;
    const quantity = Math.min(qty, available, MAX_QTY_PER_ITEM);
    if (quantity > 0) merged.push({ productId, quantity });
  }
  return merged;
}
