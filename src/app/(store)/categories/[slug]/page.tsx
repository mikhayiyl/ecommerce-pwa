import { notFound } from "next/navigation";
import { Suspense } from "react";
import CatalogView from "@/components/products/CatalogView";
import { CatalogSkeleton } from "@/components/products/CatalogSkeleton";
import { getCategories, getCategoryBySlug } from "@/features/products/queries";

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  return { title: category?.name ?? "Category" };
}

async function CategoryContent({ params, searchParams }: PageProps<"/categories/[slug]">) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();
  return (
    <>
      <h1 className="mb-6 text-3xl font-bold">{category.name}</h1>
      <CatalogView basePath={`/categories/${slug}`} searchParams={searchParams} fixedCategory={slug} />
    </>
  );
}

export default function CategoryPage(props: PageProps<"/categories/[slug]">) {
  return (
    <Suspense fallback={<CatalogSkeleton />}>
      <CategoryContent {...props} />
    </Suspense>
  );
}
