import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { BarList, LineChart } from "@/components/charts/Charts";
import { Badge, PageHeader, StatCard } from "@/components/admin/ui";
import { buildAnalytics } from "@/features/orders/analytics";
import { statusTone, type OrderStatusValue } from "@/features/orders/status";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

const RANGES = [7, 30, 90] as const;

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000);
}

async function Content({ searchParams }: PageProps<"/admin/analytics">) {
  const sp = await searchParams;
  await connection();
  const days = RANGES.find((r) => String(r) === sp.days) ?? 30;
  const since = daysAgo(days);

  const orders = await prisma.order.findMany({
    where: { createdAt: { gte: since } },
    select: {
      createdAt: true,
      status: true,
      totalCents: true,
      items: { select: { name: true, priceCents: true, quantity: true, product: { select: { category: { select: { name: true } } } } } },
    },
  });

  const data = buildAnalytics(
    orders.map((o) => ({
      ...o,
      items: o.items.map((i) => ({ name: i.name, priceCents: i.priceCents, quantity: i.quantity, category: i.product?.category.name ?? null })),
    })),
    days,
  );

  return (
    <>
      <nav className="mb-6 flex gap-2" aria-label="Date range">
        {RANGES.map((r) => (
          <Link key={r} href={`/admin/analytics?days=${r}`} aria-current={r === days ? "page" : undefined}
            className={`rounded-lg border px-3 py-1.5 text-sm ${r === days ? "border-accent text-accent" : "border-border"}`}>
            Last {r} days
          </Link>
        ))}
      </nav>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Revenue" value={formatPrice(data.totalRevenueCents)} />
        <StatCard label="Paid orders" value={String(data.totalOrders)} />
        <StatCard label="Avg. order value" value={formatPrice(data.totalOrders ? Math.round(data.totalRevenueCents / data.totalOrders) : 0)} />
      </div>
      <section className="mb-6 rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 font-semibold">Sales over time</h2>
        <LineChart points={data.points} />
      </section>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 font-semibold">Top products</h2>
          <BarList rows={data.topProducts} label="Top products" />
        </section>
        <section className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-3 font-semibold">Category performance</h2>
          <BarList rows={data.categories} label="Category performance" />
        </section>
      </div>
      <section className="mt-6 rounded-xl border border-border bg-surface p-4">
        <h2 className="mb-3 font-semibold">Order trends by status</h2>
        <div className="flex flex-wrap gap-3">
          {data.statusCounts.map((s) => (
            <div key={s.status} className="flex items-center gap-2 text-sm">
              <Badge tone={statusTone[s.status as OrderStatusValue]}>{s.status}</Badge> {s.count}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default function AdminAnalyticsPage(props: PageProps<"/admin/analytics">) {
  return (
    <>
      <PageHeader title="Analytics" description="Sales, products and order trends." />
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Content {...props} />
      </Suspense>
    </>
  );
}
