import { formatPrice } from "@/lib/utils";

export type FactProduct = {
  slug: string;
  name: string;
  brand: string | null;
  priceCents: number;
  currency: string;
  stock: number;
  rating: number;
  category: { name: string };
};

export const SYSTEM_PROMPT = `You are ShopWave's shopping assistant.
Rules:
- Only mention products, prices, stock levels and ratings that appear in the PRODUCT FACTS block. Never invent or estimate them.
- Never state or guess payment, order or shipping status; tell the shopper to check their account for that.
- If the facts do not contain a suitable product, say so and suggest adjusting the search.
- Be concise (under 120 words). When comparing, explain trade-offs in price, rating and availability.`;

export function stockText(stock: number): string {
  return stock === 0 ? "out of stock" : stock <= 10 ? `only ${stock} left` : "in stock";
}

export function factsBlock(products: FactProduct[]): string {
  if (products.length === 0) return "PRODUCT FACTS: (no matching products)";
  return (
    "PRODUCT FACTS:\n" +
    products
      .map(
        (p) =>
          `- ${p.name}${p.brand ? ` by ${p.brand}` : ""} | ${p.category.name} | ${formatPrice(p.priceCents, p.currency)} | rating ${p.rating.toFixed(1)}/5 | ${stockText(p.stock)} | /products/${p.slug}`,
      )
      .join("\n")
  );
}

export function fallbackReply(products: FactProduct[], compare: boolean): string {
  if (products.length === 0) return "I couldn't find matching products. Try a different description, budget or category.";
  if (compare && products.length >= 2) {
    const [a, b] = products;
    const cheaper = a.priceCents <= b.priceCents ? a : b;
    const better = a.rating >= b.rating ? a : b;
    return `${a.name} costs ${formatPrice(a.priceCents, a.currency)} (${a.rating.toFixed(1)}★, ${stockText(a.stock)}); ${b.name} costs ${formatPrice(b.priceCents, b.currency)} (${b.rating.toFixed(1)}★, ${stockText(b.stock)}). ${cheaper.name} is cheaper${cheaper === better ? " and also rated higher" : `, while ${better.name} is rated higher`}.`;
  }
  return `Here are the best matches I found, based on live catalog data:\n` + products.slice(0, 4).map((p) => `• ${p.name} – ${formatPrice(p.priceCents, p.currency)} (${p.rating.toFixed(1)}★, ${stockText(p.stock)})`).join("\n");
}
