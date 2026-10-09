import { Suspense } from "react";
import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { prisma } from "@/lib/prisma";

async function Content() {
  const s = await prisma.storeSettings.findUnique({ where: { id: "store" } });
  return (
    <SettingsForm
      values={{
        name: s?.name ?? "ShopWave",
        currency: s?.currency ?? "usd",
        shippingFlat: (s?.shippingFlatCents ?? 599) / 100,
        freeShippingOver: (s?.freeShippingOverCents ?? 10000) / 100,
        taxPercent: s?.taxPercent ?? 0,
      }}
    />
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Store details, currency, shipping rules and tax." />
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <Content />
      </Suspense>
    </>
  );
}
