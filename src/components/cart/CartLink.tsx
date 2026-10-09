"use client";

import Link from "next/link";
import { useCart } from "@/features/cart/cart-store";

export default function CartLink() {
  const items = useCart();
  const count = items.reduce((n, i) => n + i.quantity, 0);
  return (
    <Link href="/cart" className="relative transition hover:text-accent" aria-label={`Cart, ${count} items`}>
      Cart
      {count > 0 && (
        <span className="absolute -right-4 -top-2 flex size-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-background">
          {count}
        </span>
      )}
    </Link>
  );
}
