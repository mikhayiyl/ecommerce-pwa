import Link from "next/link";

export const metadata = { title: "Payment cancelled", robots: { index: false } };

export default function CancelPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4 rounded-xl border border-border bg-surface p-6 text-center">
      <h1 className="text-2xl font-bold">Payment cancelled</h1>
      <p className="text-muted">No payment was taken. Your cart is still saved.</p>
      <Link href="/cart" className="inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-background">Return to cart</Link>
    </div>
  );
}
