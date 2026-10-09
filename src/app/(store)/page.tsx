import Image from "next/image";
import Link from "next/link";
import ProductGrid from "@/components/products/ProductGrid";
import RecommendationSection from "@/components/ai/RecommendationSection";
import { getCategories, getFeaturedProducts } from "@/features/products/queries";

export default async function HomePage() {
  const [categories, featured] = await Promise.all([getCategories(), getFeaturedProducts(8)]);

  return (
    <div className="space-y-14">
      <section className="rounded-2xl border border-border bg-surface px-6 py-14 sm:px-12">
        <h1 className="max-w-xl text-4xl font-bold leading-tight sm:text-5xl">
          Everything you need, <span className="text-accent">delivered fast</span>
        </h1>
        <p className="mt-4 max-w-lg text-muted">
          Browse electronics, fashion, beauty and home essentials.
        </p>
        <Link
          href="/products"
          className="mt-8 inline-block rounded-lg bg-accent px-6 py-3 font-semibold text-background transition hover:bg-accent-strong"
        >
          Shop now
        </Link>
      </section>

      <section aria-labelledby="cats">
        <h2 id="cats" className="mb-4 text-2xl font-semibold">Shop by category</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`/categories/${c.slug}`}
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-4 text-center transition hover:border-accent"
            >
              <div className="relative size-20">
                {c.imageUrl && (
                  <Image src={c.imageUrl} alt="" fill sizes="80px" className="object-contain" />
                )}
              </div>
              <span className="text-sm font-medium">{c.name}</span>
              <span className="text-xs text-muted">{c._count.products} items</span>
            </Link>
          ))}
        </div>
      </section>

      <section aria-labelledby="featured">
        <h2 id="featured" className="mb-4 text-2xl font-semibold">Featured products</h2>
        <ProductGrid products={featured} />
      </section>

      <RecommendationSection />
    </div>
  );
}
