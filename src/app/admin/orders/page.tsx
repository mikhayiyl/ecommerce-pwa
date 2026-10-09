import Link from "next/link";
import { Suspense } from "react";
import { Badge, DataTable, EmptyState, PageHeader, ghostButtonClass, inputClass, td, th } from "@/components/admin/ui";
import { ORDER_STATUSES, statusTone } from "@/features/orders/status";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

const PAGE_SIZE = 15;
const PAYMENTS = ["UNPAID", "PAID", "FAILED", "REFUNDED"] as const;

async function Content({ searchParams }: PageProps<"/admin/orders">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const status = ORDER_STATUSES.find((s) => s === sp.status);
  const payment = PAYMENTS.find((s) => s === sp.payment);
  const page = Math.max(1, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const num = /^\d+$/.test(q) ? Number(q) : undefined;

  const where = {
    ...(status && { status }),
    ...(payment && { paymentStatus: payment }),
    ...(q && {
      OR: [
        { email: { contains: q, mode: "insensitive" as const } },
        ...(num !== undefined && num < 2_000_000_000 ? [{ number: num }] : []),
      ],
    }),
  };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { items: true } } },
    }),
    prisma.order.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (payment) params.set("payment", payment);
    params.set("page", String(p));
    return `/admin/orders?${params}`;
  };

  return (
    <>
      <form className="mb-4 flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={q} placeholder="Order # or email" className={`${inputClass} max-w-xs`} />
        <select name="status" defaultValue={status ?? ""} className={`${inputClass} w-40`} aria-label="Status">
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select name="payment" defaultValue={payment ?? ""} className={`${inputClass} w-40`} aria-label="Payment">
          <option value="">All payments</option>
          {PAYMENTS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button className={ghostButtonClass}>Filter</button>
      </form>

      {orders.length === 0 ? (
        <EmptyState>No orders match.</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th className={th}>Order</th><th className={th}>Customer</th><th className={th}>Date</th>
              <th className={th}>Items</th><th className={th}>Total</th><th className={th}>Payment</th><th className={th}>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td className={td}><Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-accent">#{o.number}</Link></td>
                <td className={td}>{o.email}</td>
                <td className={`${td} whitespace-nowrap text-muted`}>{o.createdAt.toISOString().slice(0, 10)}</td>
                <td className={td}>{o._count.items}</td>
                <td className={td}>{formatPrice(o.totalCents)}</td>
                <td className={td}><Badge tone={o.paymentStatus === "PAID" ? "green" : o.paymentStatus === "UNPAID" ? "yellow" : o.paymentStatus === "FAILED" ? "red" : "gray"}>{o.paymentStatus}</Badge></td>
                <td className={td}><Badge tone={statusTone[o.status]}>{o.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          {page > 1 ? <Link href={link(page - 1)} className={ghostButtonClass}>Previous</Link> : <span />}
          <span className="text-muted">Page {page} of {pages} · {total} orders</span>
          {page < pages ? <Link href={link(page + 1)} className={ghostButtonClass}>Next</Link> : <span />}
        </nav>
      )}
    </>
  );
}

export default function AdminOrdersPage(props: PageProps<"/admin/orders">) {
  return (
    <>
      <PageHeader title="Orders" description="Track payment and fulfilment." />
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Content {...props} />
      </Suspense>
    </>
  );
}
