import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OrderStatusForm } from "@/components/admin/OrderStatusForm";
import { Badge, DataTable, PageHeader, td, th } from "@/components/admin/ui";
import { allowedTransitions, statusTone } from "@/features/orders/status";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

async function Content({ params }: PageProps<"/admin/orders/[id]">) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, user: { select: { id: true, name: true } } },
  });
  if (!order) notFound();

  const rows: [string, number][] = [
    ["Subtotal", order.subtotalCents],
    ["Discount", -order.discountCents],
    ["Shipping", order.shippingCents],
    ["Tax", order.taxCents],
  ];

  return (
    <>
      <PageHeader
        title={`Order #${order.number}`}
        description={`Placed ${order.createdAt.toISOString().slice(0, 16).replace("T", " ")}`}
        action={
          <div className="flex gap-2">
            <Badge tone={statusTone[order.status]}>{order.status}</Badge>
            <Badge tone={order.paymentStatus === "PAID" ? "green" : "yellow"}>{order.paymentStatus}</Badge>
          </div>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DataTable>
            <thead><tr><th className={th}>Item</th><th className={th}>Price</th><th className={th}>Qty</th><th className={th}>Total</th></tr></thead>
            <tbody>
              {order.items.map((i) => (
                <tr key={i.id}>
                  <td className={td}>{i.name}</td>
                  <td className={td}>{formatPrice(i.priceCents)}</td>
                  <td className={td}>{i.quantity}</td>
                  <td className={td}>{formatPrice(i.priceCents * i.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <dl className="ml-auto max-w-xs space-y-1 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between"><dt className="text-muted">{k}{k === "Discount" && order.couponCode ? ` (${order.couponCode})` : ""}</dt><dd>{formatPrice(v)}</dd></div>
            ))}
            <div className="flex justify-between border-t border-border pt-1 font-semibold"><dt>Total</dt><dd>{formatPrice(order.totalCents)}</dd></div>
          </dl>
        </div>
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-surface p-4">
            <h2 className="mb-2 font-semibold">Fulfilment</h2>
            <OrderStatusForm orderId={order.id} options={allowedTransitions(order.status)} />
          </section>
          <section className="rounded-xl border border-border bg-surface p-4 text-sm">
            <h2 className="mb-2 font-semibold">Customer</h2>
            <p>{order.shippingName ?? order.user?.name ?? "Guest"}</p>
            <p className="text-muted">{order.email}</p>
            {order.shippingAddress && <p className="mt-2 whitespace-pre-line text-muted">{order.shippingAddress}</p>}
            {order.user && <Link href={`/admin/customers/${order.user.id}`} className="mt-2 inline-block text-accent">View customer</Link>}
          </section>
        </div>
      </div>
    </>
  );
}

export default function AdminOrderPage(props: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Content {...props} />
    </Suspense>
  );
}
