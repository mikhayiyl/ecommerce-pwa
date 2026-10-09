import { formatPrice } from "@/lib/utils";

export function LineChart({ points }: { points: { date: string; revenueCents: number }[] }) {
  const w = 600;
  const h = 200;
  const pad = 8;
  const max = Math.max(1, ...points.map((p) => p.revenueCents));
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const xy = points.map((p, i) => [pad + i * step, h - pad - (p.revenueCents / max) * (h - pad * 2)] as const);
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${pad},${h - pad} ${line} ${pad + (points.length - 1) * step},${h - pad}`;

  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Revenue over time" className="w-full">
        <polygon points={area} className="fill-accent/15" />
        <polyline points={line} fill="none" strokeWidth="2" className="stroke-accent" />
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs text-muted">
        <span>{points[0]?.date}</span>
        <span>Peak {formatPrice(max)} / day</span>
        <span>{points.at(-1)?.date}</span>
      </figcaption>
    </figure>
  );
}

export function BarList({ rows, label }: { rows: { name: string; revenueCents: number; units: number }[]; label: string }) {
  const max = Math.max(1, ...rows.map((r) => r.revenueCents));
  if (rows.length === 0) return <p className="text-sm text-muted">No sales in this period.</p>;
  return (
    <ul aria-label={label} className="space-y-3">
      {rows.map((r) => (
        <li key={r.name} className="text-sm">
          <div className="mb-1 flex justify-between gap-3">
            <span className="truncate">{r.name}</span>
            <span className="shrink-0 text-muted">{formatPrice(r.revenueCents)} · {r.units} sold</span>
          </div>
          <div className="h-2 rounded-full bg-white/10">
            <div className="h-2 rounded-full bg-accent" style={{ width: `${(r.revenueCents / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
