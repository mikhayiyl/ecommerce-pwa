import Link from "next/link";
import { Badge, DataTable, EmptyState, PageHeader, StatCard, td, th } from "@/components/admin/ui";
import { getOverview } from "@/features/orders/admin-queries";
import { formatPrice } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const o = await getOverview();
  return (
    <>
      <PageHeader title="Overview" description="Store performance at a glance." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={formatPrice(o.revenueCents)} hint="Paid & fulfilled orders" />
        <StatCard label="Orders" value={String(o.orderCount)} />
        <StatCard label="Avg. order value" value={formatPrice(o.averageOrderCents)} />
        <StatCard label="Customers" value={String(o.customerCount)} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold">Low-stock alerts</h2>
          {o.lowStock.length === 0 ? (
            <EmptyState>All products are well stocked.</EmptyState>
          ) : (
            <DataTable>
              <thead>
                <tr><th className={th}>Product</th><th className={th}>Stock</th></tr>
              </thead>
              <tbody>
                {o.lowStock.map((p) => (
                  <tr key={p.id}>
                    <td className={td}>
                      <Link href={`/admin/products/${p.id}/edit`} className="hover:text-accent">{p.name}</Link>
                    </td>
                    <td className={td}>
                      <Badge tone={p.stock === 0 ? "red" : "yellow"}>{p.stock === 0 ? "Out of stock" : `${p.stock} left`}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-semibold">Recent orders</h2>
          {o.recent.length === 0 ? (
            <EmptyState>No orders yet.</EmptyState>
          ) : (
            <DataTable>
              <thead>
                <tr><th className={th}>Order</th><th className={th}>Status</th><th className={th}>Total</th></tr>
              </thead>
              <tbody>
                {o.recent.map((r) => (
                  <tr key={r.id}>
                    <td className={td}>
                      <Link href={`/admin/orders/${r.id}`} className="hover:text-accent">#{r.number}</Link>
                    </td>
                    <td className={td}><Badge>{r.status}</Badge></td>
                    <td className={td}>{formatPrice(r.totalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </section>
      </div>
    </>
  );
}
