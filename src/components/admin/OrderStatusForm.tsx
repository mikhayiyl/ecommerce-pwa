"use client";

import { useActionState } from "react";
import { updateOrderStatusAction, type OrderState } from "@/actions/orders";
import { buttonClass, inputClass } from "@/components/admin/ui";

export function OrderStatusForm({ orderId, options }: { orderId: string; options: string[] }) {
  const [state, action, pending] = useActionState<OrderState, FormData>(
    updateOrderStatusAction.bind(null, orderId),
    {},
  );
  if (options.length === 0) return <p className="text-sm text-muted">No further status changes.</p>;
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <select name="status" className={`${inputClass} w-40`} aria-label="New status">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <button disabled={pending} className={buttonClass}>Update status</button>
      {state.error && <p role="alert" className="w-full text-sm text-red-400">{state.error}</p>}
      {state.success && <p role="status" className="w-full text-sm text-emerald-400">{state.success}</p>}
    </form>
  );
}
