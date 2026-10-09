"use client";

import Link from "next/link";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main role="alert" className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted">An unexpected error occurred. Please try again.</p>
      {error.digest && <p className="text-xs text-muted">Reference: {error.digest}</p>}
      <div className="flex gap-3">
        <button onClick={reset} className="rounded-lg bg-accent px-4 py-2 font-medium text-background">Try again</button>
        <Link href="/" className="rounded-lg border border-border px-4 py-2">Go home</Link>
      </div>
    </main>
  );
}
