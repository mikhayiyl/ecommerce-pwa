"use client";

import { useActionState } from "react";
import { updateSettingsAction, type SettingsState } from "@/actions/settings";
import { buttonClass, inputClass } from "@/components/admin/ui";

type Values = { name: string; currency: string; shippingFlat: number; freeShippingOver: number; taxPercent: number };

export function SettingsForm({ values }: { values: Values }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(updateSettingsAction, {});
  return (
    <form action={action} className="grid max-w-2xl gap-4 rounded-xl border border-border bg-surface p-5 sm:grid-cols-2">
      <label className="text-sm sm:col-span-2">Store name<input name="name" required defaultValue={values.name} className={inputClass} /></label>
      <label className="text-sm">Currency (ISO code)<input name="currency" required maxLength={3} defaultValue={values.currency} className={inputClass} /></label>
      <label className="text-sm">Tax (%)<input name="taxPercent" type="number" step="0.01" min="0" max="100" defaultValue={values.taxPercent} className={inputClass} /></label>
      <label className="text-sm">Flat shipping ($)<input name="shippingFlat" type="number" step="0.01" min="0" defaultValue={values.shippingFlat} className={inputClass} /></label>
      <label className="text-sm">Free shipping over ($)<input name="freeShippingOver" type="number" step="0.01" min="0" defaultValue={values.freeShippingOver} className={inputClass} /></label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className={buttonClass}>Save settings</button>
        {state.error && <span role="alert" className="text-sm text-red-400">{state.error}</span>}
        {state.success && <span role="status" className="text-sm text-emerald-400">{state.success}</span>}
      </div>
    </form>
  );
}
