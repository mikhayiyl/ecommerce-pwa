import Link from "next/link";
import { Suspense } from "react";
import { AdjustForm, ThresholdForm } from "@/components/admin/InventoryForms";
import { Badge, DataTable, EmptyState, PageHeader, ghostButtonClass, inputClass, td, th } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";

async function Content({ searchParams }: PageProps<"/admin/inventory">) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().slice(0, 100) : "";
  const low = sp.low === "1";

  const all = await prisma.product.findMany({
    where: {
      status: { not: "ARCHIVED" },
      ...(q && { name: { contains: q, mode: "insensitive" } }),
    },
    orderBy: { stock: "asc" },
    select: { id: true, name: true, stock: true, lowStockThreshold: true },
    take: 300,
  });
  const products = (low ? all.filter((p) => p.stock <= p.lowStockThreshold) : all).slice(0, 40);

  const movements = await prisma.stockMovement.findMany({
    orderBy: { createdAt: "desc" },
    take: 15,
    include: { product: { select: { name: true } } },
  });

  return (
    <>
      <form className="mb-4 flex flex-wrap items-center gap-2">
        <input name="q" defaultValue={q} placeholder="Search product" className={`${inputClass} max-w-xs`} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="low" value="1" defaultChecked={low} /> Low stock only
        </label>
        <button className={ghostButtonClass}>Filter</button>
      </form>

      {products.length === 0 ? (
        <EmptyState>No products match.</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr><th className={th}>Product</th><th className={th}>Stock</th><th className={th}>Threshold</th><th className={th}>Adjust stock</th></tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className={td}><Link href={`/admin/products/${p.id}/edit`} className="hover:text-accent">{p.name}</Link></td>
                <td className={td}>
                  <Badge tone={p.stock === 0 ? "red" : p.stock <= p.lowStockThreshold ? "yellow" : "green"}>{p.stock}</Badge>
                </td>
                <td className={td}><ThresholdForm productId={p.id} value={p.lowStockThreshold} /></td>
                <td className={td}><AdjustForm productId={p.id} /></td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      <h2 className="mb-3 mt-10 font-semibold">Recent stock movements</h2>
      {movements.length === 0 ? (
        <EmptyState>No movements recorded.</EmptyState>
      ) : (
        <DataTable>
          <thead>
            <tr><th className={th}>When</th><th className={th}>Product</th><th className={th}>Change</th><th className={th}>Reason</th></tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id}>
                <td className={`${td} whitespace-nowrap text-muted`}>{m.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td>
                <td className={td}>{m.product.name}</td>
                <td className={td}><Badge tone={m.delta > 0 ? "green" : "red"}>{m.delta > 0 ? `+${m.delta}` : m.delta}</Badge></td>
                <td className={td}>{m.reason}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}
    </>
  );
}

export default function AdminInventoryPage(props: PageProps<"/admin/inventory">) {
  return (
    <>
      <PageHeader title="Inventory" description="Stock levels, adjustments and movement history." />
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Content {...props} />
      </Suspense>
    </>
  );
}
