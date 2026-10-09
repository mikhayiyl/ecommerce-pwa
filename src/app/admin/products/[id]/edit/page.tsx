import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/admin/ui";
import ProductForm from "@/components/admin/ProductForm";
import { prisma } from "@/lib/prisma";

async function Content({ params }: PageProps<"/admin/products/[id]/edit">) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!product) notFound();
  return (
    <>
      <PageHeader title={`Edit ${product.name}`} />
      <ProductForm id={id} categories={categories} product={product} />
    </>
  );
}

export default function EditProductPage(props: PageProps<"/admin/products/[id]/edit">) {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Content {...props} />
    </Suspense>
  );
}
