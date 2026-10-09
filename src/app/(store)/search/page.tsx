import { Suspense } from "react";
import CatalogView from "@/components/products/CatalogView";
import { CatalogSkeleton } from "@/components/products/CatalogSkeleton";

export const metadata = { title: "Search" };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <h1 className="mb-6 text-3xl font-bold">Search</h1>
      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogView basePath="/search" searchParams={searchParams} />
      </Suspense>
    </>
  );
}
