export type ParsedQuery = {
  keywords: string[];
  category?: string;
  min?: number;
  max?: number;
  rating?: number;
  inStock?: boolean;
  sort?: "price-asc" | "price-desc" | "rating";
};

const STOP = new Set([
  "a", "an", "and", "the", "for", "to", "of", "in", "on", "with", "me", "my", "i", "we", "find", "show", "get",
  "need", "want", "looking", "look", "some", "any", "good", "best", "please", "that", "is", "are", "can", "you",
  "under", "below", "over", "above", "less", "more", "than", "at", "least", "most", "around", "about", "up",
  "cheap", "cheapest", "top", "rated", "stars", "star", "available", "stock", "dollars", "usd", "budget", "buy", "something",
]);

const num = (s: string) => Number(s.replace(/,/g, ""));

export function parseQuery(text: string, categories: { name: string; slug: string }[] = []): ParsedQuery {
  let rest = text.toLowerCase();
  const out: ParsedQuery = { keywords: [] };

  const between = rest.match(/between\s+\$?(\d[\d,.]*)\s+(?:and|-|to)\s+\$?(\d[\d,.]*)/);
  if (between) {
    out.min = num(between[1]);
    out.max = num(between[2]);
    rest = rest.replace(between[0], " ");
  }
  const max = rest.match(/(?:under|below|less than|up to|cheaper than|max(?:imum)?|within)\s*\$?(\d[\d,.]*)/);
  if (max && out.max === undefined) {
    out.max = num(max[1]);
    rest = rest.replace(max[0], " ");
  }
  const min = rest.match(/(?:over|above|more than|at least|min(?:imum)?)\s*\$?(\d[\d,.]*)(?!\s*stars?)/);
  if (min && out.min === undefined) {
    out.min = num(min[1]);
    rest = rest.replace(min[0], " ");
  }
  const rating = rest.match(/(\d(?:\.\d)?)\s*\+?\s*stars?/);
  if (rating) {
    out.rating = Math.min(5, Number(rating[1]));
    rest = rest.replace(rating[0], " ");
  }
  if (/\b(in stock|available)\b/.test(rest)) out.inStock = true;
  if (/\b(cheapest|lowest price)\b/.test(rest)) out.sort = "price-asc";
  else if (/\b(most expensive|premium|luxury)\b/.test(rest)) out.sort = "price-desc";
  else if (/\b(top rated|best rated|highest rated)\b/.test(rest)) out.sort = "rating";

  const words = rest.replace(/[^a-z0-9\s'-]/g, " ").split(/\s+/).filter(Boolean);
  const singular = (w: string) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);
  const category = categories.find((c) => {
    const n = c.name.toLowerCase();
    return rest.includes(n) || words.some((w) => singular(w) === singular(n));
  });
  if (category) out.category = category.slug;

  out.keywords = words
    .filter((w) => !STOP.has(w) && !/^\d+$/.test(w) && w.length > 1)
    .filter((w) => !category || singular(w) !== singular(category.name.toLowerCase()));
  return out;
}
