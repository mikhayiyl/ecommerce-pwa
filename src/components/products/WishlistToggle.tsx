"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleWishlistAction } from "@/actions/wishlist";

export default function WishlistToggle({
  productId,
  initial,
  loginHref,
}: {
  productId: string;
  initial: boolean;
  loginHref: string;
}) {
  const [on, setOn] = useState(initial);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={on}
      onClick={() =>
        start(async () => {
          const res = await toggleWishlistAction(productId);
          if (res.needsLogin) return router.push(loginHref);
          setOn(!!res.wishlisted);
        })
      }
      className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm transition hover:border-accent"
    >
      <span aria-hidden className={on ? "text-red-400" : ""}>{on ? "♥" : "♡"}</span>
      {on ? "Saved to wishlist" : "Add to wishlist"}
    </button>
  );
}
