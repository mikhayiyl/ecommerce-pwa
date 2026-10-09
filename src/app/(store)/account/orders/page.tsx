import type { Metadata } from "next";
import Link from "next/link";
import { Badge } from "@/components/admin/ui";
import { statusTone } from "@/features/orders/status";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/security/guards";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "My orders" };

export default async function OrdersPage() {
  const user = await requireUser("/account/orders");
  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Order history</h1>
      {orders.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-muted">You haven&apos;t placed any orders yet.</p>
          <Link href="/products" className="mt-4 inline-block rounded-lg bg-accent px-4 py-2 font-medium text-background">
            Start shopping
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/account/orders/${o.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 transition hover:border-accent"
              >
                <div>
                  <p className="font-semibold">Order #{o.number}</p>
                  <p className="text-sm text-muted">
                    {o.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })} · {o._count.items} line item
                    {o._count.items === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge tone={statusTone[o.status]}>{o.status}</Badge>
                  <span className="font-semibold text-accent">{formatPrice(o.totalCents)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
