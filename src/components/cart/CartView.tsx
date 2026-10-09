"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getCartDetails, type CartLine } from "@/actions/cart";
import { removeFromCart, setQuantity, useCart } from "@/features/cart/cart-store";
import { FREE_SHIPPING_THRESHOLD_CENTS, calculateTotals } from "@/features/cart/pricing";
import { formatPrice } from "@/lib/utils";

export default function CartView() {
  const items = useCart();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);

  const key = JSON.stringify(items);
  useEffect(() => {
    let cancelled = false;
    getCartDetails(JSON.parse(key)).then((res) => {
      if (cancelled) return;
      setLines(res.lines);
      setLoaded(true);
      // Drop items that are no longer purchasable and clamp quantities to server stock.
      const valid = new Map(res.lines.map((l) => [l.productId, l]));
      for (const item of JSON.parse(key) as { productId: string; quantity: number }[]) {
        const l = valid.get(item.productId);
        if (!l) removeFromCart(item.productId);
        else if (l.quantity !== item.quantity) setQuantity(item.productId, l.quantity);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted">Your cart is empty.</p>
        <Link href="/products" className="mt-4 inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-background">
          Continue shopping
        </Link>
      </div>
    );
  }

  if (!loaded) return <div className="h-64 animate-pulse rounded-xl bg-surface" aria-busy="true" />;

  const visible = lines.filter((l) => items.some((i) => i.productId === l.productId));
  const subtotal = visible.reduce((s, l) => s + l.unitPriceCents * (items.find((i) => i.productId === l.productId)?.quantity ?? l.quantity), 0);
  const totals = calculateTotals(subtotal);
  const toFree = FREE_SHIPPING_THRESHOLD_CENTS - subtotal;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
      <ul className="space-y-4">
        {visible.map((l) => {
          const qty = items.find((i) => i.productId === l.productId)?.quantity ?? l.quantity;
          return (
            <li key={l.productId} className="flex gap-4 rounded-xl border border-border bg-surface p-4">
              <div className="relative size-24 shrink-0 rounded-lg bg-white/5">
                {l.imageUrl && <Image src={l.imageUrl} alt="" fill sizes="96px" className="object-contain p-2" />}
              </div>
              <div className="flex flex-1 flex-col gap-2">
                <Link href={`/products/${l.slug}`} className="font-medium hover:text-accent">{l.name}</Link>
                <span className="text-sm text-muted">{formatPrice(l.unitPriceCents)} each</span>
                <div className="mt-auto flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label={`Decrease quantity of ${l.name}`} onClick={() => setQuantity(l.productId, qty - 1)} className="size-8 rounded border border-border hover:border-accent">−</button>
                    <span aria-live="polite" className="w-6 text-center">{qty}</span>
                    <button type="button" aria-label={`Increase quantity of ${l.name}`} disabled={qty >= l.stock} onClick={() => setQuantity(l.productId, qty + 1)} className="size-8 rounded border border-border hover:border-accent disabled:opacity-40">+</button>
                  </div>
                  <span className="font-semibold text-accent">{formatPrice(l.unitPriceCents * qty)}</span>
                </div>
                {qty >= l.stock && <span className="text-xs text-amber-400">Maximum available stock reached</span>}
                <button type="button" onClick={() => removeFromCart(l.productId)} className="self-start text-xs text-muted hover:text-red-400">Remove</button>
              </div>
            </li>
          );
        })}
      </ul>

      <aside className="h-fit space-y-3 rounded-xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold">Order summary</h2>
        <Row label="Subtotal" value={formatPrice(totals.subtotalCents)} />
        <Row label="Shipping" value={totals.shippingCents === 0 ? "Free" : formatPrice(totals.shippingCents)} />
        <div className="border-t border-border pt-3">
          <Row label="Total" value={formatPrice(totals.totalCents)} bold />
        </div>
        {toFree > 0 && <p className="text-xs text-muted">Add {formatPrice(toFree)} more for free shipping.</p>}
        <Link href="/checkout" className="block rounded-lg bg-accent px-6 py-3 text-center font-semibold text-background hover:bg-accent-strong">
          Checkout
        </Link>
      </aside>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-lg font-semibold" : "text-sm text-muted"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
