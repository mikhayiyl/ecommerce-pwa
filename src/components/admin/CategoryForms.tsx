"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { deleteCategoryAction, saveCategoryAction, type CategoryState } from "@/actions/categories";
import { buttonClass, ghostButtonClass, inputClass } from "@/components/admin/ui";

type Cat = { id: string; name: string; description: string | null };

export function CategoryForm({ category, onDone }: { category?: Cat; onDone?: () => void }) {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<CategoryState, FormData>(
    async (prev, fd) => {
      const r = await saveCategoryAction(category?.id ?? null, prev, fd);
      if (r.success) {
        if (!category) ref.current?.reset();
        onDone?.();
      }
      return r;
    },
    {},
  );
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-start gap-2">
      <input name="name" defaultValue={category?.name} placeholder="Name" aria-label="Name" className={`${inputClass} max-w-xs`} required />
      <input name="description" defaultValue={category?.description ?? ""} placeholder="Description (optional)" aria-label="Description" className={`${inputClass} max-w-sm`} />
      <button disabled={pending} className={buttonClass}>{category ? "Save" : "Add category"}</button>
      {state.error && <p role="alert" className="w-full text-sm text-red-400">{state.error}</p>}
      {state.success && !category && <p role="status" className="w-full text-sm text-emerald-400">{state.success}</p>}
    </form>
  );
}

export function CategoryActions({ category }: { category: Cat }) {
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();

  if (editing) {
    return <CategoryForm category={category} onDone={() => setEditing(false)} />;
  }
  return (
    <div className="flex items-center justify-end gap-2">
      {error && <span role="alert" className="text-xs text-red-400">{error}</span>}
      <button className={ghostButtonClass} onClick={() => setEditing(true)}>Edit</button>
      <button
        className={ghostButtonClass}
        disabled={pending}
        onClick={() => {
          if (!confirm(`Delete "${category.name}"?`)) return;
          start(async () => setError((await deleteCategoryAction(category.id)).error));
        }}
      >
        Delete
      </button>
    </div>
  );
}
