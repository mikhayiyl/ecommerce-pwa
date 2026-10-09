import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-6xl font-bold text-accent">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <div className="flex gap-3">
        <Link href="/" className="rounded-lg bg-accent px-4 py-2 font-medium text-background">Go home</Link>
        <Link href="/products" className="rounded-lg border border-border px-4 py-2">Browse products</Link>
      </div>
    </main>
  );
}
