"use client";

import { useEffect, useRef } from "react";
import { saveCartAction, syncCartAction } from "@/actions/cart-sync";
import { clearCart, getCartSnapshot, replaceCart, subscribeCart } from "@/features/cart/cart-store";

const OWNER_KEY = "cart:owner";

// Keeps the device cart and the account cart in step for signed-in users.
export default function CartSync({ userId }: { userId: string | null }) {
  const ready = useRef(false);

  useEffect(() => {
    if (!userId) {
      // Signed out: don't leak the previous account's cart to the next visitor.
      if (localStorage.getItem(OWNER_KEY)) {
        clearCart();
        localStorage.removeItem(OWNER_KEY);
      }
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const previousOwner = localStorage.getItem(OWNER_KEY);
    const local = previousOwner && previousOwner !== userId ? [] : getCartSnapshot();
    syncCartAction(local).then((merged) => {
      if (cancelled || !merged) return;
      localStorage.setItem(OWNER_KEY, userId);
      // Keep edits the shopper made while the sync request was in flight.
      const startQty = new Map(local.map((i) => [i.productId, i.quantity]));
      const result = new Map(merged.map((i) => [i.productId, i.quantity]));
      for (const item of getCartSnapshot()) {
        if (startQty.get(item.productId) !== item.quantity) result.set(item.productId, item.quantity);
      }
      for (const [productId] of startQty) {
        if (!getCartSnapshot().some((i) => i.productId === productId)) result.delete(productId);
      }
      ready.current = true;
      replaceCart([...result].map(([productId, quantity]) => ({ productId, quantity })));
    });

    const unsubscribe = subscribeCart(() => {
      if (!ready.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => void saveCartAction(getCartSnapshot()), 600);
    });

    return () => {
      cancelled = true;
      ready.current = false;
      clearTimeout(timer);
      unsubscribe();
    };
  }, [userId]);

  return null;
}
