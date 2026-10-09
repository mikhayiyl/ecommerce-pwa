import Link from "next/link";

type Props = {
  basePath: string;
  params: Record<string, string | number | undefined>;
  page: number;
  pageCount: number;
};

export default function Pagination({ basePath, params, page, pageCount }: Props) {
  if (pageCount <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "" && k !== "page") sp.set(k, String(v));
    }
    if (p > 1) sp.set("page", String(p));
    const qs = sp.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const btn = "rounded-lg border border-border px-4 py-2 text-sm";

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-center gap-4">
      {page > 1 ? (
        <Link href={href(page - 1)} className={`${btn} hover:border-accent`}>Previous</Link>
      ) : (
        <span className={`${btn} opacity-40`}>Previous</span>
      )}
      <span className="text-sm text-muted">Page {page} of {pageCount}</span>
      {page < pageCount ? (
        <Link href={href(page + 1)} className={`${btn} hover:border-accent`}>Next</Link>
      ) : (
        <span className={`${btn} opacity-40`}>Next</span>
      )}
    </nav>
  );
}
