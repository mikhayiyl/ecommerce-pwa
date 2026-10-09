import { Suspense } from "react";
import AccountNav from "@/components/account/AccountNav";

export default function AccountLayout({ children }: LayoutProps<"/account">) {
  return (
    <div className="grid gap-6 md:grid-cols-[200px_1fr]">
      <aside>
        <Suspense fallback={<div className="h-10 animate-pulse rounded-lg bg-surface" />}>
          <AccountNav />
        </Suspense>
      </aside>
      <div className="min-w-0">
        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-surface" />}>{children}</Suspense>
      </div>
    </div>
  );
}
