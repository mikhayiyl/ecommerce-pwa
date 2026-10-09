"use client";

import { useActionState, useRef, useEffect } from "react";
import { useTransition } from "react";
import {
  createDiscountAction,
  deleteDiscountAction,
  toggleDiscountAction,
  type DiscountState,
} from "@/actions/discounts";
import { buttonClass, ghostButtonClass, inputClass } from "@/components/admin/ui";

export function DiscountForm() {
  const [state, action, pending] = useActionState<DiscountState, FormData>(createDiscountAction, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={action} className="mb-8 grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-3">
      <label className="text-sm">Code<input name="code" required className={inputClass} placeholder="SUMMER20" /></label>
      <label className="text-sm">Type
        <select name="type" className={inputClass}><option value="PERCENT">Percent (%)</option><option value="FIXED">Fixed ($)</option></select>
      </label>
      <label className="text-sm">Value<input name="value" type="number" step="0.01" min="0" required className={inputClass} /></label>
      <label className="text-sm">Expires<input name="expiresAt" type="date" className={inputClass} /></label>
      <label className="text-sm">Usage limit<input name="usageLimit" type="number" min="1" step="1" className={inputClass} placeholder="Unlimited" /></label>
      <label className="text-sm">Min. subtotal ($)<input name="minSubtotal" type="number" min="0" step="0.01" className={inputClass} placeholder="0" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked /> Active</label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className={buttonClass}>Create discount</button>
        {state.error && <span role="alert" className="text-sm text-red-400">{state.error}</span>}
        {state.success && <span role="status" className="text-sm text-emerald-400">{state.success}</span>}
      </div>
    </form>
  );
}

export function DiscountRowActions({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <button disabled={pending} className={ghostButtonClass} onClick={() => start(() => toggleDiscountAction(id, !active))}>
        {active ? "Deactivate" : "Activate"}
      </button>
      <button
        disabled={pending}
        className={`${ghostButtonClass} text-red-400`}
        onClick={() => {
          if (confirm("Delete this discount?")) start(() => deleteDiscountAction(id));
        }}
      >
        Delete
      </button>
    </div>
  );
}
