import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DisableButton } from "@/components/admin/DisableButton";
import { Badge, DataTable, EmptyState, PageHeader, StatCard, td, th } from "@/components/admin/ui";
import { statusTone } from "@/features/orders/status";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

async function Content({ params }: PageProps<"/admin/customers/[id]">) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: { orders: { orderBy: { createdAt: "desc" }, take: 50 } },
  });
  if (!user) notFound();

  const spent = user.orders
    .filter((o) => ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"].includes(o.status))
    .reduce((s, o) => s + o.totalCents, 0);

  return (
    <>
      <PageHeader
        title={user.name ?? user.email}
        description={user.email}
        action={user.role === "ADMIN" ? <Badge tone="blue">ADMIN</Badge> : <DisableButton userId={user.id} disabled={user.disabled} />}
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Orders" value={String(user.orders.length)} />
        <StatCard label="Total spent" value={formatPrice(spent)} />
        <StatCard label="Status" value={user.disabled ? "Disabled" : "Active"} hint={`Joined ${user.createdAt.toISOString().slice(0, 10)}`} />
      </div>
      <h2 className="mb-3 font-semibold">Order history</h2>
      {user.orders.length === 0 ? (
        <EmptyState>No orders yet.</EmptyState>
      ) : (
        <DataTable>
          <thead><tr><th className={th}>Order</th><th className={th}>Date</th><th className={th}>Total</th><th className={th}>Status</th></tr></thead>
          <tbody>
            {user.orders.map((o) => (
              <tr key={o.id}>
                <td className={td}><Link href={`/admin/orders/${o.id}`} className="hover:text-accent">#{o.number}</Link></td>
                <td className={`${td} text-muted`}>{o.createdAt.toISOString().slice(0, 10)}</td>
                <td className={td}>{formatPrice(o.totalCents, o.currency)}</td>
                <td className={td}><Badge tone={statusTone[o.status]}>{o.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}

export default function AdminCustomerPage(props: PageProps<"/admin/customers/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Content {...props} />
    </Suspense>
  );
}
