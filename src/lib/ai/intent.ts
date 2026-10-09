const COMPARE = /\b(compare|vs\.?|versus|difference between|differences between)\b/i;

export function splitComparison(text: string): string[] | null {
  if (!COMPARE.test(text)) return null;
  const parts = text
    .replace(/\b(compare|difference between|differences between)\b/gi, " ")
    .split(/\bvs\.?\b|\bversus\b|\band\b|\bwith\b|,/i)
    .map((p) => p.replace(/[?!.]/g, "").trim())
    .filter((p) => p.length >= 2);
  return parts.length >= 2 ? parts.slice(0, 3) : null;
}

// Fixed-window limiter; per server instance, which is enough to blunt abuse of a paid API.
const hits = new Map<string, { count: number; reset: number }>();

export function rateLimit(key: string, limit = 20, windowMs = 60_000, now = Date.now()): boolean {
  const entry = hits.get(key);
  if (!entry || entry.reset <= now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    if (hits.size > 5000) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}
