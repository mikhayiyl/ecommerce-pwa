import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/admin/ui";
import { statusTone } from "@/features/orders/status";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/security/guards";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Order details" };

const STEPS = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export default async function OrderDetailPage({ params }: PageProps<"/account/orders/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/account/orders/${id}`);
  const order = await prisma.order.findFirst({
    where: { id, userId: user.id },
    include: { items: true },
  });
  if (!order) notFound();

  const stepIndex = STEPS.indexOf(order.status as (typeof STEPS)[number]);
  const rows: [string, number][] = [
    ["Subtotal", order.subtotalCents],
    ...(order.discountCents ? ([[`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`, -order.discountCents]] as [string, number][]) : []),
    ["Shipping", order.shippingCents],
    ["Tax", order.taxCents],
  ];

  return (
    <div className="space-y-6">
      <Link href="/account/orders" className="text-sm text-muted hover:text-accent">← All orders</Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Order #{order.number}</h1>
        <Badge tone={statusTone[order.status]}>{order.status}</Badge>
        <Badge tone={order.paymentStatus === "PAID" ? "green" : "gray"}>{order.paymentStatus}</Badge>
      </div>
      <p className="text-sm text-muted">Placed {order.createdAt.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>

      {stepIndex >= 0 ? (
        <ol aria-label="Order progress" className="grid grid-cols-4 gap-2 text-center text-xs">
          {STEPS.map((s, i) => (
            <li key={s} className={`rounded-lg border p-2 ${i <= stepIndex ? "border-accent text-accent" : "border-border text-muted"}`}>
              {s}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted">This order is {order.status.toLowerCase()}.</p>
      )}

      <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
        {order.items.map((it) => (
          <li key={it.id} className="flex justify-between gap-4 p-4 text-sm">
            <span>{it.name} <span className="text-muted">× {it.quantity}</span></span>
            <span>{formatPrice(it.priceCents * it.quantity)}</span>
          </li>
        ))}
      </ul>

      <div className="ml-auto max-w-xs space-y-1 text-sm">
        {rows.map(([label, cents]) => (
          <div key={label} className="flex justify-between text-muted">
            <span>{label}</span>
            <span>{cents < 0 ? `-${formatPrice(-cents)}` : formatPrice(cents)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
          <span>Total</span>
          <span className="text-accent">{formatPrice(order.totalCents)}</span>
        </div>
      </div>

      {order.shippingAddress && (
        <section>
          <h2 className="mb-1 font-semibold">Shipping to</h2>
          <p className="whitespace-pre-line text-sm text-muted">{order.shippingName}{"\n"}{order.shippingAddress}</p>
        </section>
      )}
    </div>
  );
}
