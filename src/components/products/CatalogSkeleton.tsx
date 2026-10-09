export function CatalogSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[16rem_1fr]" aria-busy="true">
      <div className="h-96 animate-pulse rounded-xl bg-surface" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
