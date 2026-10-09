import Link from "next/link";
import { Suspense } from "react";
import { ReviewActions } from "@/components/admin/ReviewActions";
import { Badge, DataTable, EmptyState, PageHeader, ghostButtonClass, inputClass, td, th } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 15;

async function Content({ searchParams }: PageProps<"/admin/reviews">) {
  const sp = await searchParams;
  const filter = sp.filter === "hidden" ? "hidden" : sp.filter === "visible" ? "visible" : "";
  const page = Math.max(1, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const where = filter ? { hidden: filter === "hidden" } : {};

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { product: { select: { name: true, slug: true } }, user: { select: { name: true, email: true } } },
    }),
    prisma.review.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => `/admin/reviews?${new URLSearchParams({ ...(filter && { filter }), page: String(p) })}`;

  return (
    <>
      <form className="mb-4 flex gap-2">
        <select name="filter" defaultValue={filter} className={`${inputClass} w-40`} aria-label="Visibility">
          <option value="">All reviews</option>
          <option value="visible">Visible</option>
          <option value="hidden">Hidden</option>
        </select>
        <button className={ghostButtonClass}>Filter</button>
      </form>
      {reviews.length === 0 ? (
        <EmptyState>No reviews found.</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr><th className={th}>Product</th><th className={th}>Author</th><th className={th}>Rating</th><th className={th}>Comment</th><th className={th}>Status</th><th className={th}>Actions</th></tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id}>
                <td className={td}><Link href={`/products/${r.product.slug}`} className="hover:text-accent">{r.product.name}</Link></td>
                <td className={td}>{r.user.name ?? r.user.email}</td>
                <td className={td}>{"★".repeat(r.rating)}<span className="text-muted">{"★".repeat(5 - r.rating)}</span></td>
                <td className={`${td} max-w-xs`}>{r.comment}</td>
                <td className={td}><Badge tone={r.hidden ? "red" : "green"}>{r.hidden ? "Hidden" : "Visible"}</Badge></td>
                <td className={td}><ReviewActions reviewId={r.id} hidden={r.hidden} /></td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          {page > 1 ? <Link href={href(page - 1)} className={ghostButtonClass}>Previous</Link> : <span />}
          <span className="text-muted">Page {page} of {pages} · {total} reviews</span>
          {page < pages ? <Link href={href(page + 1)} className={ghostButtonClass}>Next</Link> : <span />}
        </nav>
      )}
    </>
  );
}

export default function AdminReviewsPage(props: PageProps<"/admin/reviews">) {
  return (
    <>
      <PageHeader title="Reviews" description="Moderate customer reviews. Hidden reviews are not shown on the storefront." />
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Content {...props} />
      </Suspense>
    </>
  );
}
