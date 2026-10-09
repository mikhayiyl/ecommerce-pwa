export type Candidate = { id: string; categoryId: string; priceCents: number; rating: number; stock: number };
export type Signals = { categoryWeights: Map<string, number>; avgPriceCents: number | null };

// Higher is better: category affinity dominates, then price proximity, then rating.
export function scoreCandidate(c: Candidate, s: Signals): number {
  const affinity = s.categoryWeights.get(c.categoryId) ?? 0;
  const priceFit = s.avgPriceCents ? 1 / (1 + Math.abs(c.priceCents - s.avgPriceCents) / s.avgPriceCents) : 0.5;
  return affinity * 3 + priceFit * 1.5 + c.rating / 5;
}

export function rank<T extends Candidate>(candidates: T[], signals: Signals, take: number): T[] {
  return candidates
    .filter((c) => c.stock > 0)
    .map((c) => ({ c, score: scoreCandidate(c, signals) }))
    .sort((a, b) => b.score - a.score || a.c.id.localeCompare(b.c.id))
    .slice(0, take)
    .map((x) => x.c);
}

export function buildSignals(items: { categoryId: string; priceCents: number; weight: number }[]): Signals {
  const categoryWeights = new Map<string, number>();
  let total = 0;
  let weightSum = 0;
  for (const i of items) {
    categoryWeights.set(i.categoryId, (categoryWeights.get(i.categoryId) ?? 0) + i.weight);
    total += i.priceCents * i.weight;
    weightSum += i.weight;
  }
  const max = Math.max(0, ...categoryWeights.values());
  if (max > 0) for (const [k, v] of categoryWeights) categoryWeights.set(k, v / max);
  return { categoryWeights, avgPriceCents: weightSum ? total / weightSum : null };
}
