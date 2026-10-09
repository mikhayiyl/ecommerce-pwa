"use client";

import { useActionState } from "react";
import { saveProductAction, type ProductFormState } from "@/actions/products";
import { buttonClass, inputClass } from "@/components/admin/ui";

type Props = {
  id: string | null;
  categories: { id: string; name: string }[];
  product?: {
    name: string;
    description: string;
    priceCents: number;
    stock: number;
    lowStockThreshold: number;
    categoryId: string;
    brand: string | null;
    imageUrl: string | null;
    status: string;
    featured: boolean;
  };
};

function Field({ label, error, children }: { label: string; error?: string[]; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      {children}
      {error && <span role="alert" className="mt-1 block text-xs text-red-400">{error[0]}</span>}
    </label>
  );
}

export default function ProductForm({ id, categories, product }: Props) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(
    saveProductAction.bind(null, id),
    {},
  );
  const e = state.fieldErrors ?? {};
  return (
    <form action={action} className="grid max-w-3xl gap-4 sm:grid-cols-2">
      {state.error && <p role="alert" className="text-sm text-red-400 sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2">
        <Field label="Name" error={e.name}>
          <input name="name" defaultValue={product?.name} className={inputClass} required />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <Field label="Description" error={e.description}>
          <textarea name="description" defaultValue={product?.description} rows={5} className={inputClass} required />
        </Field>
      </div>
      <Field label="Price (USD)" error={e.price}>
        <input name="price" type="number" step="0.01" min="0.01" defaultValue={product ? (product.priceCents / 100).toFixed(2) : ""} className={inputClass} required />
      </Field>
      <Field label="Brand" error={e.brand}>
        <input name="brand" defaultValue={product?.brand ?? ""} className={inputClass} />
      </Field>
      <Field label="Stock" error={e.stock}>
        <input name="stock" type="number" min="0" step="1" defaultValue={product?.stock ?? 0} className={inputClass} required />
      </Field>
      <Field label="Low-stock threshold" error={e.lowStockThreshold}>
        <input name="lowStockThreshold" type="number" min="0" step="1" defaultValue={product?.lowStockThreshold ?? 5} className={inputClass} />
      </Field>
      <Field label="Category" error={e.categoryId}>
        <select name="categoryId" defaultValue={product?.categoryId ?? ""} className={inputClass} required>
          <option value="" disabled>Select…</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Status" error={e.status}>
        <select name="status" defaultValue={product?.status ?? "DRAFT"} className={inputClass}>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Image URL (https)" error={e.imageUrl}>
          <input name="imageUrl" type="url" defaultValue={product?.imageUrl ?? ""} className={inputClass} placeholder="https://…" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="featured" defaultChecked={product?.featured} /> Featured on homepage
      </label>
      <div className="sm:col-span-2">
        <button type="submit" disabled={pending} className={buttonClass}>
          {pending ? "Saving…" : id ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  );
}
