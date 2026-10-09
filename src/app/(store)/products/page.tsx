import { Suspense } from "react";
import CatalogView from "@/components/products/CatalogView";
import { CatalogSkeleton } from "@/components/products/CatalogSkeleton";

export const metadata = { title: "Shop all products" };

export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <>
      <h1 className="mb-6 text-3xl font-bold">All products</h1>
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogView basePath="/products" searchParams={searchParams} />
      </Suspense>
    </>
  );
}
