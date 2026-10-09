"use client";

import { useEffect, useState } from "react";
import ProductGrid from "@/components/products/ProductGrid";
import type { ProductCardData } from "@/components/products/ProductCard";
import { getRecentIds, recordView } from "@/features/recommendations/recent";

export default function RecommendationSection({ currentProductId }: { currentProductId?: string }) {
  const [state, setState] = useState<{ products: ProductCardData[]; personalised: boolean } | null>(null);

  useEffect(() => {
    if (currentProductId) recordView(currentProductId);
    const ids = getRecentIds();
    const controller = new AbortController();
    fetch(`/api/ai/recommendations?viewed=${encodeURIComponent(ids.join(","))}`, { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setState(data))
      .catch(() => {});
    return () => controller.abort();
  }, [currentProductId]);

  if (!state || state.products.length === 0) return null;
  const products = state.products.slice(0, 4);
  return (
    <section aria-labelledby="recommended">
      <h2 id="recommended" className="mb-4 text-2xl font-semibold">
        {state.personalised ? "Recommended for you" : "Popular picks"}
      </h2>
      <ProductGrid products={products} />
    </section>
  );
}
