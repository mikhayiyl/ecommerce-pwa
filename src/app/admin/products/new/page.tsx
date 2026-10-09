import { Suspense } from "react";
import { PageHeader } from "@/components/admin/ui";
import ProductForm from "@/components/admin/ProductForm";
import { prisma } from "@/lib/prisma";

async function Content() {
  const categories = await prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return <ProductForm id={null} categories={categories} />;
}

export default function NewProductPage() {
  return (
    <>
      <PageHeader title="New product" />
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Content />
      </Suspense>
    </>
  );
}
