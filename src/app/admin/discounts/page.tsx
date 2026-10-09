import { Suspense } from "react";
import { DiscountForm, DiscountRowActions } from "@/components/admin/DiscountForms";
import { Badge, DataTable, EmptyState, PageHeader, td, th } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";
import { formatPrice } from "@/lib/utils";

async function List() {
  const discounts = await prisma.discount.findMany({ orderBy: { createdAt: "desc" } });
  if (discounts.length === 0) return <EmptyState>No discounts yet.</EmptyState>;
  const now = new Date();
  return (
    <DataTable>
      <thead>
        <tr><th className={th}>Code</th><th className={th}>Discount</th><th className={th}>Used</th><th className={th}>Min. subtotal</th><th className={th}>Expires</th><th className={th}>Status</th><th className={th}>Actions</th></tr>
      </thead>
      <tbody>
        {discounts.map((d) => {
          const expired = d.expiresAt !== null && d.expiresAt < now;
          return (
            <tr key={d.id}>
              <td className={`${td} font-mono font-medium`}>{d.code}</td>
              <td className={td}>{d.type === "PERCENT" ? `${d.value}%` : formatPrice(d.value)}</td>
              <td className={td}>{d.usedCount}{d.usageLimit !== null ? ` / ${d.usageLimit}` : ""}</td>
              <td className={td}>{d.minSubtotalCents ? formatPrice(d.minSubtotalCents) : "—"}</td>
              <td className={`${td} text-muted`}>{d.expiresAt ? d.expiresAt.toISOString().slice(0, 10) : "Never"}</td>
              <td className={td}><Badge tone={expired ? "gray" : d.active ? "green" : "red"}>{expired ? "Expired" : d.active ? "Active" : "Inactive"}</Badge></td>
              <td className={td}><DiscountRowActions id={d.id} active={d.active} /></td>
            </tr>
          );
        })}
      </tbody>
    </DataTable>
  );
}

export default function AdminDiscountsPage() {
  return (
    <>
      <PageHeader title="Discounts" description="Coupon codes with expiry and usage limits." />
      <DiscountForm />
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <List />
      </Suspense>
    </>
  );
}
