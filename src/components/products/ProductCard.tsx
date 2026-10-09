import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

export type ProductCardData = {
  slug: string;
  name: string;
  priceCents: number;
  currency: string;
  imageUrl: string | null;
  rating: number;
  stock: number;
  category: { name: string };
};

export default function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition hover:border-accent"
    >
      <div className="relative aspect-square bg-white/5">
        {product.imageUrl && (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-contain p-4 transition group-hover:scale-105"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-xs text-muted">{product.category.name}</span>
        <h3 className="line-clamp-2 text-sm font-medium">{product.name}</h3>
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="font-semibold text-accent">
            {formatPrice(product.priceCents, product.currency)}
          </span>
          <span className="text-xs text-muted">★ {product.rating.toFixed(1)}</span>
        </div>
        {product.stock === 0 && <span className="text-xs text-red-400">Out of stock</span>}
      </div>
    </Link>
  );
}
