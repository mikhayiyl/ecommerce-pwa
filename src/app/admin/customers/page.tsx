import Link from "next/link";
import { Suspense } from "react";
import { Badge, DataTable, EmptyState, PageHeader, ghostButtonClass, inputClass, td, th } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 15;

async function Content({ searchParams }: PageProps<"/admin/customers">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const page = Math.max(1, Number.parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const where = q
    ? { OR: [{ email: { contains: q, mode: "insensitive" as const } }, { name: { contains: q, mode: "insensitive" as const } }] }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { orders: true } } },
    }),
    prisma.user.count({ where }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const href = (p: number) => `/admin/customers?${new URLSearchParams({ ...(q && { q }), page: String(p) })}`;

  return (
    <>
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Name or email" className={`${inputClass} max-w-xs`} />
        <button className={ghostButtonClass}>Search</button>
      </form>
      {users.length === 0 ? (
        <EmptyState>No customers found.</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr><th className={th}>Name</th><th className={th}>Email</th><th className={th}>Role</th><th className={th}>Orders</th><th className={th}>Joined</th><th className={th}>Status</th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className={td}><Link href={`/admin/customers/${u.id}`} className="font-medium hover:text-accent">{u.name ?? "—"}</Link></td>
                <td className={td}>{u.email}</td>
                <td className={td}><Badge tone={u.role === "ADMIN" ? "blue" : "gray"}>{u.role}</Badge></td>
                <td className={td}>{u._count.orders}</td>
                <td className={`${td} text-muted`}>{u.createdAt.toISOString().slice(0, 10)}</td>
                <td className={td}><Badge tone={u.disabled ? "red" : "green"}>{u.disabled ? "Disabled" : "Active"}</Badge></td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pagination">
          {page > 1 ? <Link href={href(page - 1)} className={ghostButtonClass}>Previous</Link> : <span />}
          <span className="text-muted">Page {page} of {pages} · {total} customers</span>
          {page < pages ? <Link href={href(page + 1)} className={ghostButtonClass}>Next</Link> : <span />}
        </nav>
      )}
    </>
  );
}

export default function AdminCustomersPage(props: PageProps<"/admin/customers">) {
  return (
    <>
      <PageHeader title="Customers" description="Accounts and their order history." />
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Content {...props} />
      </Suspense>
    </>
  );
}
