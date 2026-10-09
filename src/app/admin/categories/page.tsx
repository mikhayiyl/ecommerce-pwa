import { Suspense } from "react";
import { CategoryActions, CategoryForm } from "@/components/admin/CategoryForms";
import { DataTable, EmptyState, PageHeader, td, th } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";

async function List() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  if (categories.length === 0) return <EmptyState>No categories yet.</EmptyState>;
  return (
    <DataTable>
      <thead>
        <tr><th className={th}>Name</th><th className={th}>Slug</th><th className={th}>Products</th><th className={th}></th></tr>
      </thead>
      <tbody>
        {categories.map((c) => (
          <tr key={c.id}>
            <td className={td}>{c.name}</td>
            <td className={`${td} text-muted`}>{c.slug}</td>
            <td className={td}>{c._count.products}</td>
            <td className={td}><CategoryActions category={c} /></td>
          </tr>
        ))}
      </tbody>
    </DataTable>
  );
}

export default function AdminCategoriesPage() {
  return (
    <>
      <PageHeader title="Categories" description="Organise the catalogue." />
      <div className="mb-6"><CategoryForm /></div>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <List />
      </Suspense>
    </>
  );
}
