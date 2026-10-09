import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Order received", robots: { index: false } };

async function Success({ searchParams }: { searchParams: PageProps<"/checkout/success">["searchParams"] }) {
  const { order: id } = await searchParams;
  const session = await auth();
  const order = typeof id === "string" ? await prisma.order.findUnique({ where: { id }, include: { items: true } }) : null;
  // Guests hold the unguessable order id; signed-in owners are matched by account.
  if (!order || (order.userId && order.userId !== session?.user?.id)) {
    return <p className="py-16 text-center text-muted">Order not found.</p>;
  }
  const paid = order.paymentStatus === "PAID";
  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-border bg-surface p-6">
      <h1 className="text-2xl font-bold">{paid ? "Payment received" : "Order received"}</h1>
      <p className="text-muted">Order #{order.number} · confirmation for {order.email}</p>
      <p role="status" className={`rounded-lg border px-3 py-2 text-sm ${paid ? "border-green-500/40 text-green-400" : "border-amber-500/40 text-amber-400"}`}>
        {paid ? "Your payment was confirmed." : "Awaiting payment. Online payment will be enabled soon; your items are reserved."}
      </p>
      <ul className="space-y-1 text-sm">
        {order.items.map((i) => (
          <li key={i.id} className="flex justify-between"><span>{i.quantity} × {i.name}</span><span>{formatPrice(i.priceCents * i.quantity)}</span></li>
        ))}
      </ul>
      <p className="flex justify-between border-t border-border pt-3 text-lg font-semibold"><span>Total</span><span>{formatPrice(order.totalCents)}</span></p>
      <Link href="/products" className="inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-background">Continue shopping</Link>
    </div>
  );
}

export default function SuccessPage(props: PageProps<"/checkout/success">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-surface" />}>
      <Success searchParams={props.searchParams} />
    </Suspense>
  );
}
