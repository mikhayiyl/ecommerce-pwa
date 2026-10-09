import Link from "next/link";
import { Suspense } from "react";

export const metadata = { title: "Payment cancelled", robots: { index: false } };

async function Cancelled({ searchParams }: { searchParams: PageProps<"/checkout/cancel">["searchParams"] }) {
  const { order } = await searchParams;
  const orderId = typeof order === "string" && order.length <= 40 ? order : null;
  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-border bg-surface p-6 text-center">
      <h1 className="text-2xl font-bold">Payment cancelled</h1>
      <p className="text-muted">
        No payment was taken.
        {orderId ? " Your order is held for a short time, so you can pay now or choose another method." : " Your cart is still saved."}
      </p>
      <Link
        href={orderId ? `/checkout/success?order=${encodeURIComponent(orderId)}` : "/cart"}
        className="inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-background"
      >
        {orderId ? "Back to my order" : "Return to cart"}
      </Link>
    </div>
  );
}

export default function CancelPage(props: PageProps<"/checkout/cancel">) {
  return (
    <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-surface" />}>
      <Cancelled searchParams={props.searchParams} />
    </Suspense>
  );
}
