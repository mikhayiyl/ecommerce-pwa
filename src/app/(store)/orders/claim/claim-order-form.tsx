"use client";

import { useState, useTransition } from "react";
import { confirmGuestOrderClaimAction } from "@/actions/guest-order-claim";

type ClaimOrderFormProps = {
  token: string;
};

export default function ClaimOrderForm({ token }: ClaimOrderFormProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  function handleClaim() {
    setResult(null);

    startTransition(async () => {
      const response = await confirmGuestOrderClaimAction(token);
      setResult(response);
    });
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={handleClaim}
        disabled={isPending || result?.ok === true}
        className="w-full rounded-xl bg-neutral-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending
          ? "Claiming order..."
          : result?.ok
            ? "Order claimed"
            : "Confirm and claim order"}
      </button>

      {result && (
        <p
          role="status"
          aria-live="polite"
          className={`mt-4 text-sm ${
            result.ok ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {result.message}
        </p>
      )}
    </div>
  );
}
