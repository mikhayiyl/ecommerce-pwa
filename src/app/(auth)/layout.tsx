import { Suspense } from "react";
import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6">
        <Link href="/" className="mb-6 block text-center text-xl font-bold">
          Shop<span className="text-accent">Wave</span>
        </Link>
        <Suspense>{children}</Suspense>
      </div>
    </main>
  );
}
