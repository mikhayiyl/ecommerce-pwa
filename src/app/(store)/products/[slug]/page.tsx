import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ProductGallery from "@/components/products/ProductGallery";
import AddToCartButton from "@/components/cart/AddToCartButton";
import ProductGrid from "@/components/products/ProductGrid";
import WishlistButton from "@/components/products/WishlistButton";
import { getProductBySlug, getRelatedProducts } from "@/features/products/queries";
import { formatPrice } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.name,
    description: product.description.slice(0, 160),
    openGraph: { images: product.imageUrl ? [product.imageUrl] : [] },
  };
}

async function ProductContent({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product.categoryId, product.id);
  const images = product.images.length ? product.images : product.imageUrl ? [product.imageUrl] : [];
  const stockLabel =
    product.stock === 0 ? "Out of stock" : product.stock <= 10 ? `Only ${product.stock} left` : "In stock";

  return (
    <div className="space-y-12">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/products" className="hover:text-accent">Shop</Link> /{" "}
        <Link href={`/categories/${product.category.slug}`} className="hover:text-accent">
          {product.category.name}
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        <ProductGallery images={images} alt={product.name} />
        <div className="space-y-4">
          {product.brand && <p className="text-sm text-accent">{product.brand}</p>}
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-sm text-muted">★ {product.rating.toFixed(1)} / 5</p>
          <p className="text-3xl font-semibold text-accent">
            {formatPrice(product.priceCents, product.currency)}
          </p>
          <p className={product.stock === 0 ? "text-red-400" : product.stock <= 10 ? "text-amber-400" : "text-emerald-400"}>
            {stockLabel}
          </p>
          <p className="leading-relaxed text-muted">{product.description}</p>
          <AddToCartButton productId={product.id} stock={product.stock} />
          <Suspense fallback={<div className="h-12 w-48 animate-pulse rounded-lg bg-surface" />}>
            <WishlistButton productId={product.id} slug={product.slug} />
          </Suspense>
        </div>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related">
          <h2 id="related" className="mb-4 text-2xl font-semibold">You may also like</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}

export default function ProductPage(props: PageProps<"/products/[slug]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface" />}>
      <ProductContent {...props} />
    </Suspense>
  );
}
