"use client";

import { useTransition } from "react";
import { setCustomerDisabledAction } from "@/actions/customers";
import { ghostButtonClass } from "@/components/admin/ui";

export function DisableButton({ userId, disabled }: { userId: string; disabled: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      className={ghostButtonClass}
      onClick={() => start(() => setCustomerDisabledAction(userId, !disabled))}
    >
      {disabled ? "Enable account" : "Disable account"}
    </button>
  );
}
