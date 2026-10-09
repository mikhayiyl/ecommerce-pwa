import { SORT_OPTIONS, type ProductQuery } from "@/lib/validations/product";

type Props = {
  action: string;
  query: ProductQuery;
  categories?: { slug: string; name: string }[];
};

const field =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none";

export default function ProductFilters({ action, query, categories }: Props) {
  return (
    <form action={action} method="get" className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <div>
        <label htmlFor="q" className="mb-1 block text-xs text-muted">Search</label>
        <input id="q" name="q" defaultValue={query.q} placeholder="Product, brand…" className={field} />
      </div>

      {categories && (
        <div>
          <label htmlFor="category" className="mb-1 block text-xs text-muted">Category</label>
          <select id="category" name="category" defaultValue={query.category ?? ""} className={field}>
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="min" className="mb-1 block text-xs text-muted">Min $</label>
          <input id="min" name="min" type="number" min={0} defaultValue={query.min} className={field} />
        </div>
        <div>
          <label htmlFor="max" className="mb-1 block text-xs text-muted">Max $</label>
          <input id="max" name="max" type="number" min={0} defaultValue={query.max} className={field} />
        </div>
      </div>

      <div>
        <label htmlFor="rating" className="mb-1 block text-xs text-muted">Minimum rating</label>
        <select id="rating" name="rating" defaultValue={query.rating ?? ""} className={field}>
          <option value="">Any</option>
          {[4, 3, 2].map((r) => (
            <option key={r} value={r}>{r}★ & up</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="sort" className="mb-1 block text-xs text-muted">Sort by</label>
        <select id="sort" name="sort" defaultValue={query.sort} className={field}>
          {Object.entries(SORT_OPTIONS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="inStock" value="1" defaultChecked={!!query.inStock} className="accent-cyan-400" />
        In stock only
      </label>

      <div className="flex gap-2">
        <button type="submit" className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background hover:bg-accent-strong">
          Apply
        </button>
        <a href={action} className="rounded-lg border border-border px-4 py-2 text-sm text-muted hover:text-foreground">
          Reset
        </a>
      </div>
    </form>
  );
}
