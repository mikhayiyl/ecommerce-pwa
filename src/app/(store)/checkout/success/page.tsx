import Link from "next/link";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { formatPrice } from "@/lib/utils";
import PaymentPanel from "@/components/checkout/PaymentPanel";
import { availableMethods } from "@/features/payments/methods";
import { connection } from "next/server";
import GuestOrderClaimButton from "./guest-order-claim-button";

export const metadata = { title: "Your order", robots: { index: false } };

const FRESH_ATTEMPT_MS = 15 * 60_000;

function getCurrentTimestamp() {
  return Date.now();
}

async function Success({
  searchParams,
}: {
  searchParams: PageProps<"/checkout/success">["searchParams"];
}) {
  await connection();

  const { order: id, pay_error: payError } = await searchParams;
  const session = await auth();
  const order =
    typeof id === "string" && id.length <= 40
      ? await prisma.order.findUnique({
          where: { id },
          include: {
            items: true,
            payments: { orderBy: { createdAt: "desc" }, take: 1 },
          },
        })
      : null;
  // Guests hold the unguessable order id; signed-in owners are matched by account.
  if (!order || (order.userId && order.userId !== session?.user?.id)) {
    return <p className="py-16 text-center text-muted">Order not found.</p>;
  }

  const now = getCurrentTimestamp();
  const paid = order.paymentStatus === "PAID";
  const cancelled = order.status === "CANCELLED";
  const expired =
    order.status === "PENDING" &&
    order.expiresAt !== null &&
    order.expiresAt.getTime() <= now;
  const awaitingPayment = !paid && order.status === "PENDING" && !expired;
  const latest = order.payments[0];
  const inFlight =
    latest?.status === "PENDING" &&
    now - latest.createdAt.getTime() < FRESH_ATTEMPT_MS;
  const money = (cents: number) => formatPrice(cents, order.currency);

  let heading = "Order received";
  let tone = "border-amber-500/40 text-amber-400";
  let message =
    "Awaiting payment. Your items are held for a short time while you pay.";
  if (paid && cancelled) {
    heading = "Payment needs attention";
    tone = "border-red-500/40 text-red-400";
    message =
      "Your payment arrived after this order expired and an item sold out. We will refund you; contact the store if you do not hear from us.";
  } else if (paid) {
    heading = "Payment received";
    tone = "border-green-500/40 text-green-400";
    message =
      "Your payment was confirmed. We will email you when your order ships.";
  } else if (cancelled || expired) {
    heading = "Order cancelled";
    tone = "border-red-500/40 text-red-400";
    message =
      "This order was not paid in time, so its items were released. You can place a new order any time.";
  }

  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-border bg-surface p-6">
      <h1 className="text-2xl font-bold">{heading}</h1>
      <p className="text-muted">
        Order #{order.number} · confirmation for {order.email}
      </p>
      <p
        role="status"
        className={`rounded-lg border px-3 py-2 text-sm ${tone}`}
      >
        {message}
      </p>
      <ul className="space-y-1 text-sm">
        {order.items.map((i) => (
          <li key={i.id} className="flex justify-between">
            <span>
              {i.quantity} × {i.name}
            </span>
            <span>{money(i.priceCents * i.quantity)}</span>
          </li>
        ))}
      </ul>
      <p className="flex justify-between border-t border-border pt-3 text-lg font-semibold">
        <span>Total</span>
        <span>{money(order.totalCents)}</span>
      </p>
      {awaitingPayment && (
        <PaymentPanel
          orderId={order.id}
          methods={availableMethods(order.currency)}
          defaultPhone={order.shippingPhone ?? ""}
          inFlight={inFlight}
          notice={
            typeof payError === "string" ? payError.slice(0, 200) : undefined
          }
          totalLabel={money(order.totalCents)}
        />
      )}
      {!order.userId && (
        <div className="rounded-lg border border-border bg-background p-4">
          <h2 className="font-semibold">Make your next order easier</h2>
          <p className="mt-1 text-sm text-muted">
            Create an account to save your addresses and keep future orders in
            one place. Guest checkout will always remain available.
          </p>
          <Link
            href="/register"
            className="mt-3 inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:border-accent"
          >
            Create an account
          </Link>
          <GuestOrderClaimButton orderId={order.id} />
        </div>
      )}
      <Link
        href="/products"
        className="inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-background"
      >
        Continue shopping
      </Link>
    </div>
  );
}

export default function SuccessPage(props: PageProps<"/checkout/success">) {
  return (
    <Suspense
      fallback={<div className="h-64 animate-pulse rounded-xl bg-surface" />}
    >
      <Success searchParams={props.searchParams} />
    </Suspense>
  );
}
