"use client";

import { useActionState } from "react";
import {
  markRefundProcessedAction,
  type RefundState,
} from "@/actions/refunds";
import { buttonClass } from "@/components/admin/ui";

export function RefundStatusForm({
  paymentAttemptId,
}: {
  paymentAttemptId: string;
}) {
  const [state, action, pending] = useActionState<RefundState, FormData>(
    markRefundProcessedAction.bind(null, paymentAttemptId),
    {},
  );

  return (
    <form action={action} className="mt-3 space-y-3 rounded-lg border border-border p-3">
      <p className="text-sm font-medium text-foreground">
        Confirm completed refund
      </p>

      <label className="flex items-start gap-2 text-xs text-muted">
        <input
          type="checkbox"
          name="confirm"
          required
          className="mt-0.5 accent-current"
        />
        <span>
          I have processed this refund through the payment provider and confirmed
          the transaction.
        </span>
      </label>

      {state.error && (
        <p role="alert" className="text-xs text-red-400">
          {state.error}
        </p>
      )}

      {state.success && (
        <p role="status" className="text-xs text-emerald-400">
          {state.success}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={buttonClass}
      >
        {pending ? "Updating..." : "Mark as refunded"}
      </button>
    </form>
  );
}
