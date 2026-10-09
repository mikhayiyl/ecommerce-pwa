export type AnalyticsOrder = {
  createdAt: Date;
  status: string;
  totalCents: number;
  items: { name: string; priceCents: number; quantity: number; category: string | null }[];
};

const REVENUE = new Set(["PAID", "PROCESSING", "SHIPPED", "DELIVERED"]);

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export function buildAnalytics(orders: AnalyticsOrder[], days: number, now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1)));
  const series = new Map<string, { date: string; revenueCents: number; orders: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 86_400_000);
    series.set(dayKey(d), { date: dayKey(d), revenueCents: 0, orders: 0 });
  }

  const products = new Map<string, { name: string; units: number; revenueCents: number }>();
  const categories = new Map<string, { name: string; units: number; revenueCents: number }>();
  const statusCounts = new Map<string, number>();

  for (const o of orders) {
    if (o.createdAt < start) continue;
    statusCounts.set(o.status, (statusCounts.get(o.status) ?? 0) + 1);
    if (!REVENUE.has(o.status)) continue;
    const point = series.get(dayKey(o.createdAt));
    if (point) {
      point.revenueCents += o.totalCents;
      point.orders += 1;
    }
    for (const i of o.items) {
      const amount = i.priceCents * i.quantity;
      const p = products.get(i.name) ?? { name: i.name, units: 0, revenueCents: 0 };
      p.units += i.quantity;
      p.revenueCents += amount;
      products.set(i.name, p);
      const cname = i.category ?? "Uncategorised";
      const c = categories.get(cname) ?? { name: cname, units: 0, revenueCents: 0 };
      c.units += i.quantity;
      c.revenueCents += amount;
      categories.set(cname, c);
    }
  }

  const points = [...series.values()];
  const byRevenue = <T extends { revenueCents: number }>(a: T, b: T) => b.revenueCents - a.revenueCents;
  return {
    points,
    totalRevenueCents: points.reduce((s, p) => s + p.revenueCents, 0),
    totalOrders: points.reduce((s, p) => s + p.orders, 0),
    topProducts: [...products.values()].sort(byRevenue).slice(0, 5),
    categories: [...categories.values()].sort(byRevenue).slice(0, 8),
    statusCounts: [...statusCounts.entries()].map(([status, count]) => ({ status, count })).sort((a, b) => b.count - a.count),
  };
}
