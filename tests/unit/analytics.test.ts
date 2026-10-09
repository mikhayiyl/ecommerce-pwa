import { describe, expect, it } from "vitest";
import { buildAnalytics } from "@/features/orders/analytics";

const now = new Date("2026-10-10T12:00:00Z");
const order = (date: string, status: string, total: number, items: { name: string; priceCents: number; quantity: number; category: string | null }[]) => ({
  createdAt: new Date(date),
  status,
  totalCents: total,
  items,
});

describe("buildAnalytics", () => {
  const data = buildAnalytics(
    [
      order("2026-10-10T08:00:00Z", "PAID", 3000, [{ name: "A", priceCents: 1000, quantity: 3, category: "Tech" }]),
      order("2026-10-09T08:00:00Z", "DELIVERED", 500, [{ name: "B", priceCents: 500, quantity: 1, category: "Home" }]),
      order("2026-10-09T09:00:00Z", "CANCELLED", 900, [{ name: "B", priceCents: 900, quantity: 1, category: "Home" }]),
      order("2026-01-01T09:00:00Z", "PAID", 9999, []),
    ],
    7,
    now,
  );
  it("fills every day in the window and ignores older orders", () => {
    expect(data.points).toHaveLength(7);
    expect(data.points.at(-1)).toMatchObject({ date: "2026-10-10", revenueCents: 3000, orders: 1 });
  });
  it("excludes cancelled orders from revenue but counts them in statuses", () => {
    expect(data.totalRevenueCents).toBe(3500);
    expect(data.statusCounts.find((s) => s.status === "CANCELLED")?.count).toBe(1);
  });
  it("ranks products and categories by revenue", () => {
    expect(data.topProducts[0].name).toBe("A");
    expect(data.categories.map((c) => c.name)).toEqual(["Tech", "Home"]);
  });
});
