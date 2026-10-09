import ProductFilters from "./ProductFilters";
import ProductGrid from "./ProductGrid";
import Pagination from "./Pagination";
import { getCategories, getProducts } from "@/features/products/queries";
import { productQuerySchema } from "@/lib/validations/product";

type Props = {
  basePath: string;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  fixedCategory?: string;
};

export default async function CatalogView({ basePath, searchParams, fixedCategory }: Props) {
  const raw = await searchParams;
  const flat = Object.fromEntries(
    Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const query = productQuerySchema.parse(flat);
  if (fixedCategory) query.category = fixedCategory;

  const [{ products, total, pageCount }, categories] = await Promise.all([
    getProducts(query),
    getCategories(),
  ]);
  const page = Math.min(query.page, pageCount);

  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
      <aside>
        <ProductFilters
          action={basePath}
          query={query}
          categories={fixedCategory ? undefined : categories}
        />
      </aside>
      <div>
        <p className="mb-4 text-sm text-muted">
          {total} {total === 1 ? "product" : "products"}
        </p>
        <ProductGrid products={products} />
        <Pagination
          basePath={basePath}
          page={page}
          pageCount={pageCount}
          params={{ ...query, category: fixedCategory ? undefined : query.category, page: undefined }}
        />
      </div>
    </div>
  );
}
