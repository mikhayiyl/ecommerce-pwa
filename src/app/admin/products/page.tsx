import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import ArchiveButton from "@/components/admin/ArchiveButton";
import { Badge, DataTable, EmptyState, PageHeader, buttonClass, ghostButtonClass, inputClass, td, th } from "@/components/admin/ui";
import { getAdminProducts } from "@/features/products/admin-queries";
import { formatPrice } from "@/lib/utils";
import { adminProductQuerySchema } from "@/lib/validations/admin-product";

const tone = { ACTIVE: "green", DRAFT: "yellow", ARCHIVED: "gray" } as const;

async function Content({ searchParams }: PageProps<"/admin/products">) {
  const sp = await searchParams;
  const flat = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const query = adminProductQuerySchema.parse(flat);
  const { items, total, pageCount } = await getAdminProducts(query.q, query.status, query.page);

  const href = (page: number) => {
    const p = new URLSearchParams();
    if (query.q) p.set("q", query.q);
    if (query.status) p.set("status", query.status);
    p.set("page", String(page));
    return `/admin/products?${p}`;
  };

  return (
    <>
      <PageHeader
        title="Products"
        description={`${total} product${total === 1 ? "" : "s"}`}
        action={<Link href="/admin/products/new" className={buttonClass}>New product</Link>}
      />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={query.q} placeholder="Search name or brand" className={`${inputClass} max-w-xs`} />
        <select name="status" defaultValue={query.status ?? ""} className={`${inputClass} max-w-[10rem]`}>
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
        <button className={ghostButtonClass}>Filter</button>
      </form>
      {items.length === 0 ? (
        <EmptyState>No products match.</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr>
              <th className={th}>Product</th><th className={th}>Category</th><th className={th}>Price</th>
              <th className={th}>Stock</th><th className={th}>Status</th><th className={th}></th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td className={td}>
                  <div className="flex items-center gap-3">
                    {p.imageUrl ? (
                      <Image src={p.imageUrl} alt="" width={40} height={40} className="h-10 w-10 rounded bg-background object-contain" />
                    ) : <div className="h-10 w-10 rounded bg-background" />}
                    <span>{p.name}</span>
                  </div>
                </td>
                <td className={td}>{p.category.name}</td>
                <td className={td}>{formatPrice(p.priceCents)}</td>
                <td className={td}>
                  <Badge tone={p.stock === 0 ? "red" : p.stock <= p.lowStockThreshold ? "yellow" : "green"}>{p.stock}</Badge>
                </td>
                <td className={td}><Badge tone={tone[p.status]}>{p.status}</Badge></td>
                <td className={`${td} whitespace-nowrap text-right`}>
                  <Link href={`/admin/products/${p.id}/edit`} className={`${ghostButtonClass} mr-2`}>Edit</Link>
                  <ArchiveButton id={p.id} archived={p.status === "ARCHIVED"} />
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      {pageCount > 1 && (
        <nav aria-label="Pagination" className="mt-4 flex items-center gap-3 text-sm">
          {query.page > 1 && <Link href={href(query.page - 1)} className={ghostButtonClass}>Previous</Link>}
          <span className="text-muted">Page {query.page} of {pageCount}</span>
          {query.page < pageCount && <Link href={href(query.page + 1)} className={ghostButtonClass}>Next</Link>}
        </nav>
      )}
    </>
  );
}

export default function AdminProductsPage(props: PageProps<"/admin/products">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Content {...props} />
    </Suspense>
  );
}
