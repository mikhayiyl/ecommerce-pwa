"use client";

import { useTransition } from "react";
import { deleteReviewAction, setReviewHiddenAction } from "@/actions/reviews";
import { ghostButtonClass } from "@/components/admin/ui";

export function ReviewActions({ reviewId, hidden }: { reviewId: string; hidden: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <button disabled={pending} className={ghostButtonClass} onClick={() => start(() => setReviewHiddenAction(reviewId, !hidden))}>
        {hidden ? "Unhide" : "Hide"}
      </button>
      <button
        disabled={pending}
        className={`${ghostButtonClass} text-red-400`}
        onClick={() => {
          if (confirm("Delete this review permanently?")) start(() => deleteReviewAction(reviewId));
        }}
      >
        Delete
      </button>
    </div>
  );
}
