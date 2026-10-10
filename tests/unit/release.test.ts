import { describe, expect, it, vi } from "vitest";
import { StockUnavailableError, releaseOrderReservation, reReserveOrder } from "@/features/orders/release";

type Item = { productId: string | null; name: string; quantity: number };

// A tiny in-memory stand-in for the Prisma transaction client; just enough for the release logic.
function fakeTx(opts: { items: Item[]; couponCode?: string | null; releasedAt?: Date | null; stock?: Record<string, number> }) {
  const state = { releasedAt: opts.releasedAt ?? null, stock: { ...(opts.stock ?? {}) } as Record<string, number> };
  const log = { movements: [] as { productId: string; delta: number }[], couponCalls: [] as unknown[] };
  const order = () => ({ id: "o1", number: 7, couponCode: opts.couponCode ?? null, items: opts.items, releasedAt: state.releasedAt });

  const tx = {
    order: {
      updateMany: vi.fn(async ({ data }: { data: { releasedAt: Date } }) => {
        if (state.releasedAt !== null) return { count: 0 };
        state.releasedAt = data.releasedAt;
        return { count: 1 };
      }),
      findUnique: vi.fn(async () => order()),
      update: vi.fn(async ({ data }: { data: { releasedAt: Date | null } }) => {
        state.releasedAt = data.releasedAt;
        return order();
      }),
    },
    product: {
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { stock: { increment: number } } }) => {
        state.stock[where.id] = (state.stock[where.id] ?? 0) + data.stock.increment;
        return {};
      }),
      updateMany: vi.fn(async ({ where, data }: { where: { id: string; stock: { gte: number } }; data: { stock: { decrement: number } } }) => {
        if ((state.stock[where.id] ?? 0) < where.stock.gte) return { count: 0 };
        state.stock[where.id] -= data.stock.decrement;
        return { count: 1 };
      }),
    },
    stockMovement: {
      create: vi.fn(async ({ data }: { data: { productId: string; delta: number } }) => {
        log.movements.push({ productId: data.productId, delta: data.delta });
        return {};
      }),
    },
    discount: {
      updateMany: vi.fn(async (args: unknown) => {
        log.couponCalls.push(args);
        return { count: 1 };
      }),
    },
  };
  return { tx: tx as unknown as Parameters<typeof releaseOrderReservation>[0], state, log };
}

describe("releaseOrderReservation", () => {
  const items: Item[] = [
    { productId: "p2", name: "Mug", quantity: 3 },
    { productId: "p1", name: "Cap", quantity: 2 },
  ];

  it("returns stock and the coupon use once", async () => {
    const { tx, state, log } = fakeTx({ items, couponCode: "SAVE5", stock: { p1: 10, p2: 10 } });
    expect(await releaseOrderReservation(tx, "o1", "cancelled")).toBe(true);
    expect(state.stock).toEqual({ p1: 12, p2: 13 });
    expect(log.movements).toEqual([
      { productId: "p1", delta: 2 },
      { productId: "p2", delta: 3 },
    ]);
    expect(log.couponCalls).toHaveLength(1);
    expect(state.releasedAt).toBeInstanceOf(Date);
  });

  it("does nothing the second time, so cancel + expiry cannot double-restock", async () => {
    const { tx, state } = fakeTx({ items, stock: { p1: 10, p2: 10 } });
    await releaseOrderReservation(tx, "o1", "cancelled");
    expect(await releaseOrderReservation(tx, "o1", "expired unpaid")).toBe(false);
    expect(state.stock).toEqual({ p1: 12, p2: 13 });
  });

  it("leaves coupons alone when the order used none, and skips deleted products", async () => {
    const { tx, log, state } = fakeTx({ items: [{ productId: null, name: "Gone", quantity: 1 }, ...items], stock: { p1: 0, p2: 0 } });
    await releaseOrderReservation(tx, "o1", "cancelled");
    expect(log.couponCalls).toHaveLength(0);
    expect(state.stock).toEqual({ p1: 2, p2: 3 });
  });
});

describe("reReserveOrder", () => {
  const items: Item[] = [{ productId: "p1", name: "Cap", quantity: 2 }];

  it("takes stock back for a released order and clears the release marker", async () => {
    const { tx, state } = fakeTx({ items, couponCode: "SAVE5", releasedAt: new Date(), stock: { p1: 5 } });
    await reReserveOrder(tx, "o1");
    expect(state.stock.p1).toBe(3);
    expect(state.releasedAt).toBeNull();
  });

  it("throws when an item sold out meanwhile", async () => {
    const { tx } = fakeTx({ items, releasedAt: new Date(), stock: { p1: 1 } });
    await expect(reReserveOrder(tx, "o1")).rejects.toBeInstanceOf(StockUnavailableError);
  });

  it("is a no-op for an order that still holds its stock", async () => {
    const { tx, state } = fakeTx({ items, releasedAt: null, stock: { p1: 5 } });
    await reReserveOrder(tx, "o1");
    expect(state.stock.p1).toBe(5);
  });
});
