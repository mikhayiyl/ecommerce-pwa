import { Suspense } from "react";
import { connection } from "next/server";
import CatalogView from "@/components/products/CatalogView";
import { CatalogSkeleton } from "@/components/products/CatalogSkeleton";

export const metadata = { title: "Shop all products" };

async function CatalogContent({
  searchParams,
}: {
  searchParams: PageProps<"/products">["searchParams"];
}) {
  await connection();

  return <CatalogView basePath="/products" searchParams={searchParams} />;
}

export default function ProductsPage({ searchParams }: PageProps<"/products">) {
  return (
    <>
      <h1 className="mb-6 text-3xl font-bold">All products</h1>

      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogContent searchParams={searchParams} />
      </Suspense>
    </>
  );
}
