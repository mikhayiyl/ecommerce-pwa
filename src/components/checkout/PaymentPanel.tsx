"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { refreshPaymentAction, startPaymentAction } from "@/actions/payments";
import { buttonClass, inputClass } from "@/components/admin/ui";
import { METHOD_LABELS, type PaymentMethod } from "@/features/payments/methods";

const POLL_MS = 4000;
const MAX_POLLS = 45; // about three minutes

/** Pay (or retry paying) for an unpaid order, and watch for the confirmation to arrive. */
export default function PaymentPanel({
  orderId,
  methods,
  defaultPhone,
  inFlight,
  notice,
  totalLabel,
}: {
  orderId: string;
  methods: PaymentMethod[];
  defaultPhone: string;
  inFlight: boolean;
  notice?: string;
  totalLabel: string;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod | undefined>(methods[0]);
  const [phone, setPhone] = useState(defaultPhone);
  const [watching, setWatching] = useState(inFlight);
  const [info, setInfo] = useState<string | null>(inFlight ? "Waiting for your payment to be confirmed…" : null);
  const [error, setError] = useState<string | null>(notice ?? null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!watching) return;
    let stopped = false;
    let polls = 0;
    const timer = setInterval(async () => {
      polls += 1;
      const state = await refreshPaymentAction(orderId);
      if (stopped) return;
      if (state.paid) {
        setWatching(false);
        router.refresh();
      } else if (!state.waiting) {
        setWatching(false);
        setInfo(null);
        if (state.failed) setError(state.message || "The payment was not completed. You can try again.");
      } else if (polls >= MAX_POLLS) {
        setWatching(false);
        setInfo("Still waiting for confirmation. If you already paid, this page will update once it arrives, or refresh it in a minute.");
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [watching, orderId, router]);

  if (methods.length === 0) {
    return <p role="status" className="text-sm text-amber-400">Online payment is not available right now. Please contact the store about order payment.</p>;
  }

  function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!method) return;
    setError(null);
    start(async () => {
      const res = await startPaymentAction({ orderId, method, phone });
      if (!res.ok) return setError(res.error);
      if (res.kind === "redirect") {
        window.location.assign(res.url);
        return;
      }
      setInfo(res.message);
      setWatching(true);
    });
  }

  return (
    <form onSubmit={pay} className="space-y-3 rounded-lg border border-border p-4">
      <h2 className="font-semibold">Pay {totalLabel}</h2>
      <fieldset className="space-y-2" disabled={pending || watching}>
        <legend className="sr-only">Payment method</legend>
        {methods.map((m) => (
          <label key={m} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 text-sm has-[:checked]:border-accent">
            <input type="radio" name="method" value={m} checked={method === m} onChange={() => setMethod(m)} />
            {METHOD_LABELS[m]}
          </label>
        ))}
        {method === "MPESA" && (
          <label className="block text-sm">
            M-Pesa phone number
            <input required inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" className={inputClass} autoComplete="tel" />
          </label>
        )}
      </fieldset>
      {info && <p role="status" className="text-sm text-muted">{info}</p>}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <button type="submit" disabled={pending || watching} className={`${buttonClass} w-full disabled:opacity-50`}>
        {pending ? "Starting payment…" : watching ? "Waiting for confirmation…" : "Pay now"}
      </button>
    </form>
  );
}
