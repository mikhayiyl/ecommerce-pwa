"use client";

import { useTransition } from "react";
import { setProductStatusAction } from "@/actions/products";
import { ghostButtonClass } from "@/components/admin/ui";

export default function ArchiveButton({ id, archived }: { id: string; archived: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className={ghostButtonClass}
      onClick={() => start(() => setProductStatusAction(id, archived ? "ACTIVE" : "ARCHIVED"))}
    >
      {archived ? "Restore" : "Archive"}
    </button>
  );
}
