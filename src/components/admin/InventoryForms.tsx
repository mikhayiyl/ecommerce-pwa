"use client";

import { useActionState } from "react";
import { adjustStockAction, setThresholdAction, type InventoryState } from "@/actions/inventory";
import { ghostButtonClass, inputClass } from "@/components/admin/ui";

export function AdjustForm({ productId }: { productId: string }) {
  const [state, action, pending] = useActionState<InventoryState, FormData>(
    adjustStockAction.bind(null, productId),
    {},
  );
  return (
    <form action={action} className="flex flex-wrap items-center gap-1">
      <input name="delta" type="number" step="1" placeholder="±qty" aria-label="Adjustment" className={`${inputClass} w-20`} required />
      <input name="reason" placeholder="Reason" aria-label="Reason" className={`${inputClass} w-32`} required />
      <button disabled={pending} className={ghostButtonClass}>Apply</button>
      {state.error && <span role="alert" className="w-full text-xs text-red-400">{state.error}</span>}
    </form>
  );
}

export function ThresholdForm({ productId, value }: { productId: string; value: number }) {
  const [state, action, pending] = useActionState<InventoryState, FormData>(
    setThresholdAction.bind(null, productId),
    {},
  );
  return (
    <form action={action} className="flex items-center gap-1">
      <input name="threshold" type="number" min="0" defaultValue={value} aria-label="Low-stock threshold" className={`${inputClass} w-16`} />
      <button disabled={pending} className={ghostButtonClass}>Set</button>
      {state.error && <span role="alert" className="text-xs text-red-400">{state.error}</span>}
    </form>
  );
}
