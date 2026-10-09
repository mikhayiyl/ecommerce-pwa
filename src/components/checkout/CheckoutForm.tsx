"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { getQuoteAction, placeOrderAction, type Quote } from "@/actions/checkout";
import { startPaymentAction } from "@/actions/payments";
import { buttonClass, inputClass } from "@/components/admin/ui";
import { clearCart, useCart } from "@/features/cart/cart-store";
import { METHOD_LABELS, type PaymentMethod } from "@/features/payments/methods";
import { formatPrice } from "@/lib/utils";

type Saved = { id: string; fullName: string; line1: string; line2: string; city: string; state: string; postalCode: string; country: string; phone: string };
const EMPTY: Omit<Saved, "id"> = { fullName: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "", phone: "" };

export default function CheckoutForm({ signedInEmail, addresses }: { signedInEmail: string | null; addresses: Saved[] }) {
  const router = useRouter();
  const items = useCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteFailed, setQuoteFailed] = useState(false);
  const [reload, setReload] = useState(0);
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [email, setEmail] = useState(signedInEmail ?? "");
  const [addr, setAddr] = useState<Omit<Saved, "id">>(addresses[0] ? { ...addresses[0] } : EMPTY);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [mpesaPhone, setMpesaPhone] = useState(addresses[0]?.phone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // One key per checkout attempt, so a retried submit can never create a second order.
  const attemptKey = useRef<string | null>(null);

  const key = JSON.stringify(items);
  useEffect(() => {
    let cancelled = false;
    getQuoteAction(JSON.parse(key), appliedCoupon)
      .then((q) => {
        if (cancelled) return;
        setQuote(q);
        setQuoteFailed(false);
      })
      .catch(() => {
        if (!cancelled) setQuoteFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [key, appliedCoupon, reload]);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) => setAddr((a) => ({ ...a, [k]: e.target.value }));

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted">Your cart is empty.</p>
        <Link href="/products" className="mt-4 inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-background">Continue shopping</Link>
      </div>
    );
  }
  if (!quote) {
    if (quoteFailed) {
      return (
        <div role="alert" className="rounded-xl border border-border bg-surface p-6 text-center">
          <p className="text-muted">We could not load your order summary.</p>
          <button type="button" onClick={() => setReload((n) => n + 1)} className="mt-3 rounded-lg border border-border px-4 py-2 text-sm hover:border-accent">Try again</button>
        </div>
      );
    }
    return <div className="h-64 animate-pulse rounded-xl bg-surface" aria-busy="true" />;
  }

  const adjusted = quote.lines.length !== items.length || quote.lines.some((l) => l.quantity !== l.requestedQuantity);
  const t = quote.totals;
  const money = (cents: number) => formatPrice(cents, quote.currency);
  const chosen: PaymentMethod | null = method && quote.methods.includes(method) ? method : (quote.methods[0] ?? null);
  const noPayments = quote.methods.length === 0 && t.totalCents > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!chosen && t.totalCents > 0) return;
    setError(null);
    start(async () => {
      attemptKey.current ??= crypto.randomUUID();
      const res = await placeOrderAction({
        email,
        items,
        couponCode: appliedCoupon,
        shipping: addr,
        idempotencyKey: attemptKey.current,
        expectedTotalCents: t.totalCents,
      });
      if (!res.ok) {
        setError(res.error);
        // Pull fresh prices so a "total changed" error shows the new total.
        setReload((n) => n + 1);
        return;
      }
      attemptKey.current = null;

      if (t.totalCents === 0) {
        // Fully covered by a coupon: nothing to pay.
        clearCart();
        router.push(`/checkout/success?order=${res.orderId}`);
        return;
      }
      // The order now exists and holds its stock; take payment, falling back to the order page to retry.
      const pay = await startPaymentAction({ orderId: res.orderId, method: chosen!, phone: mpesaPhone });
      clearCart();
      if (pay.ok && pay.kind === "redirect") {
        window.location.assign(pay.url);
        return;
      }
      const notice = pay.ok ? "" : `&pay_error=${encodeURIComponent(pay.error)}`;
      router.push(`/checkout/success?order=${res.orderId}${notice}`);
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-8 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-6">
        <section className="space-y-3 rounded-xl border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold">Contact</h2>
          <label className="block text-sm">
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} readOnly={!!signedInEmail} className={inputClass} autoComplete="email" />
          </label>
          {!signedInEmail && (
            <p className="text-xs text-muted">
              Checking out as a guest. <Link href="/login?callbackUrl=/checkout" className="text-accent">Sign in</Link> to use saved addresses.
              Already ordered? <Link href="/orders/track" className="text-accent">Track your order</Link>.
            </p>
          )}
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold">Shipping details</h2>
          {addresses.length > 0 && (
            <label className="block text-sm">
              Saved address
              <select
                className={inputClass}
                defaultValue={addresses[0].id}
                onChange={(e) => {
                  const s = addresses.find((a) => a.id === e.target.value);
                  setAddr(s ? { ...s } : EMPTY);
                  if (s?.phone) setMpesaPhone(s.phone);
                }}
              >
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>{a.fullName} — {a.line1}, {a.city}</option>
                ))}
                <option value="">Enter a new address</option>
              </select>
            </label>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">Full name<input required value={addr.fullName} onChange={set("fullName")} className={inputClass} autoComplete="name" /></label>
            <label className="text-sm sm:col-span-2">Address line 1<input required value={addr.line1} onChange={set("line1")} className={inputClass} autoComplete="address-line1" /></label>
            <label className="text-sm sm:col-span-2">Address line 2 (optional)<input value={addr.line2} onChange={set("line2")} className={inputClass} autoComplete="address-line2" /></label>
            <label className="text-sm">City<input required value={addr.city} onChange={set("city")} className={inputClass} autoComplete="address-level2" /></label>
            <label className="text-sm">State / region<input value={addr.state} onChange={set("state")} className={inputClass} autoComplete="address-level1" /></label>
            <label className="text-sm">Postal code<input required value={addr.postalCode} onChange={set("postalCode")} className={inputClass} autoComplete="postal-code" /></label>
            <label className="text-sm">Country<input required value={addr.country} onChange={set("country")} className={inputClass} autoComplete="country-name" /></label>
            <label className="text-sm sm:col-span-2">Phone (optional)<input value={addr.phone} onChange={set("phone")} className={inputClass} autoComplete="tel" /></label>
          </div>
        </section>

        <section className="space-y-3 rounded-xl border border-border bg-surface p-5">
          <h2 className="text-lg font-semibold">Payment</h2>
          {noPayments ? (
            <p role="status" className="text-sm text-amber-400">Online payment is not set up for this store yet, so orders cannot be placed right now.</p>
          ) : (
            <fieldset className="space-y-2">
              <legend className="sr-only">Payment method</legend>
              {quote.methods.map((m) => (
                <label key={m} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm has-[:checked]:border-accent">
                  <input type="radio" name="method" value={m} checked={chosen === m} onChange={() => setMethod(m)} />
                  {METHOD_LABELS[m]}
                </label>
              ))}
            </fieldset>
          )}
          {chosen === "MPESA" && (
            <label className="block text-sm">
              M-Pesa phone number
              <input
                required
                inputMode="tel"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                placeholder="0712 345 678"
                className={inputClass}
                autoComplete="tel"
              />
              <span className="mt-1 block text-xs text-muted">You will get a prompt on this phone to enter your M-Pesa PIN. The amount is rounded up to whole shillings.</span>
            </label>
          )}
          {chosen === "PAYSTACK" && <p className="text-xs text-muted">You will be taken to Paystack&apos;s secure page to pay, then brought back here.</p>}
        </section>
      </div>

      <aside className="h-fit space-y-3 rounded-xl border border-border bg-surface p-5">
        <h2 className="text-lg font-semibold">Order summary</h2>
        <ul className="space-y-1 text-sm">
          {quote.lines.map((l) => (
            <li key={l.productId} className="flex justify-between gap-2">
              <span className="truncate">{l.quantity} × {l.name}</span>
              <span>{money(l.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
        {adjusted && <p role="status" className="text-xs text-amber-400">Some quantities changed to match current stock. <Link href="/cart" className="underline">Review cart</Link></p>}
        <div className="flex gap-2">
          <input aria-label="Coupon code" placeholder="Coupon code" value={coupon} onChange={(e) => setCoupon(e.target.value)} className={inputClass} />
          <button type="button" onClick={() => setAppliedCoupon(coupon)} className="rounded-lg border border-border px-3 text-sm hover:border-accent">Apply</button>
        </div>
        {quote.couponError && <p role="alert" className="text-xs text-red-400">{quote.couponError}</p>}
        {quote.couponCode && <p className="text-xs text-green-400">Coupon {quote.couponCode} applied</p>}
        <Row label="Subtotal" value={money(t.subtotalCents)} />
        {t.discountCents > 0 && <Row label="Discount" value={`−${money(t.discountCents)}`} />}
        <Row label="Shipping" value={t.shippingCents === 0 ? "Free" : money(t.shippingCents)} />
        {t.taxCents > 0 && <Row label="Tax" value={money(t.taxCents)} />}
        <div className="border-t border-border pt-3"><Row label="Total" value={money(t.totalCents)} bold /></div>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <button type="submit" disabled={pending || quote.lines.length === 0 || (!chosen && t.totalCents > 0)} className={`${buttonClass} w-full disabled:opacity-50`}>
          {pending ? "Placing order…" : chosen === "MPESA" ? "Place order & pay with M-Pesa" : "Place order & pay"}
        </button>
        <p className="text-xs text-muted">Your items are held for a short time while you pay. Payment needs an online connection and is not available offline.</p>
      </aside>
    </form>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-lg font-semibold" : "text-sm text-muted"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
