"use client";

import { useState } from "react";
import { addToCart } from "@/features/cart/cart-store";

export default function AddToCartButton({ productId, stock }: { productId: string; stock: number }) {
  const [added, setAdded] = useState(false);

  if (stock === 0) {
    return (
      <button disabled className="w-full cursor-not-allowed rounded-lg bg-border px-6 py-3 font-semibold text-muted">
        Out of stock
      </button>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          addToCart(productId, 1, stock);
          setAdded(true);
          setTimeout(() => setAdded(false), 2000);
        }}
        className="w-full rounded-lg bg-accent px-6 py-3 font-semibold text-background transition hover:bg-accent-strong"
      >
        Add to cart
      </button>
      <p role="status" aria-live="polite" className="mt-2 h-5 text-sm text-emerald-400">
        {added ? "Added to cart" : ""}
      </p>
    </div>
  );
}
