export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

const tones = {
  green: "bg-emerald-500/15 text-emerald-400",
  yellow: "bg-amber-500/15 text-amber-400",
  red: "bg-red-500/15 text-red-400",
  blue: "bg-sky-500/15 text-sky-400",
  gray: "bg-white/10 text-muted",
};

export function Badge({ tone = "gray", children }: { tone?: keyof typeof tones; children: React.ReactNode }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function DataTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-left text-sm">{children}</table>
    </div>
  );
}

export const th = "px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted";
export const td = "px-4 py-3 border-t border-border";

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted">
      {children}
    </p>
  );
}

export const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent";
export const buttonClass =
  "rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90 disabled:opacity-60";
export const ghostButtonClass =
  "rounded-lg border border-border px-3 py-1.5 text-sm transition hover:border-accent";
