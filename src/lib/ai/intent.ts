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

export { rateLimit } from "@/lib/security/rate-limit";
