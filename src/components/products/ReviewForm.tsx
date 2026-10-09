"use client";

import { useActionState, useState } from "react";
import { submitReviewAction, type ReviewState } from "@/actions/reviews";
import { buttonClass, inputClass } from "@/components/admin/ui";

export default function ReviewForm({
  productId,
  initial,
}: {
  productId: string;
  initial?: { rating: number; comment: string };
}) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(submitReviewAction, {});
  const [rating, setRating] = useState(initial?.rating ?? 0);

  return (
    <form action={action} className="max-w-xl space-y-3 rounded-xl border border-border bg-surface p-5">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="rating" value={rating} />
      <fieldset>
        <legend className="mb-1 text-sm">{initial ? "Update your review" : "Write a review"}</legend>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={rating === n}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              onClick={() => setRating(n)}
              className={`text-2xl ${n <= rating ? "text-amber-400" : "text-muted"}`}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm">
        Your review
        <textarea
          name="comment"
          required
          minLength={10}
          maxLength={1000}
          rows={4}
          defaultValue={initial?.comment}
          className={inputClass}
        />
      </label>
      <div className="flex items-center gap-3">
        <button disabled={pending} className={buttonClass}>{initial ? "Update review" : "Submit review"}</button>
        {state.error && <span role="alert" className="text-sm text-red-400">{state.error}</span>}
        {state.success && <span role="status" className="text-sm text-emerald-400">{state.success}</span>}
      </div>
    </form>
  );
}
