"use client";

import { useSyncExternalStore } from "react";
import { MAX_QTY_PER_ITEM } from "./pricing";

export type CartItem = { productId: string; quantity: number };

const KEY = "cart:v1";
const EMPTY: CartItem[] = [];
let cache: CartItem[] | null = null;
const listeners = new Set<() => void>();

function read(): CartItem[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(parsed)
      ? parsed.filter(
          (i): i is CartItem =>
            typeof i?.productId === "string" && Number.isInteger(i?.quantity) && i.quantity > 0,
        )
      : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(items: CartItem[]) {
  cache = items;
  localStorage.setItem(KEY, JSON.stringify(items));
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function addToCart(productId: string, quantity = 1, max = MAX_QTY_PER_ITEM) {
  const items = read();
  const existing = items.find((i) => i.productId === productId);
  const cap = Math.min(max, MAX_QTY_PER_ITEM);
  if (existing) {
    write(
      items.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.min(cap, i.quantity + quantity) } : i,
      ),
    );
  } else {
    write([...items, { productId, quantity: Math.min(cap, quantity) }]);
  }
}

export function setQuantity(productId: string, quantity: number) {
  if (quantity <= 0) return removeFromCart(productId);
  write(
    read().map((i) =>
      i.productId === productId ? { ...i, quantity: Math.min(quantity, MAX_QTY_PER_ITEM) } : i,
    ),
  );
}

export function removeFromCart(productId: string) {
  write(read().filter((i) => i.productId !== productId));
}

export function clearCart() {
  write([]);
}
