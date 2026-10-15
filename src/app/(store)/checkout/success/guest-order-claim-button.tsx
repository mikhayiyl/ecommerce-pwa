"use client";

import { useState, useTransition } from "react";
import { requestGuestOrderClaimAction } from "@/actions/guest-order-claim";

type GuestOrderClaimButtonProps = {
  orderId: string;
};

export default function GuestOrderClaimButton({
  orderId,
}: GuestOrderClaimButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function handleRequest() {
    setMessage("");

    startTransition(async () => {
      try {
        const result = await requestGuestOrderClaimAction(orderId);
        setMessage(result.message);
      } catch {
        setMessage("We couldn't process your request. Please try again later.");
      }
    });
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleRequest}
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Sending claim link..." : "Claim a previous guest order"}
      </button>

      {message && (
        <p role="status" aria-live="polite" className="mt-3 text-sm text-muted">
          {message}
        </p>
      )}
    </div>
  );
}
