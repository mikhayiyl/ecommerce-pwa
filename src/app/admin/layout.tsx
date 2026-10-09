import { Suspense } from "react";
import { requireAdmin } from "@/lib/security/guards";

async function Gate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense>
      <Gate>
        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
      </Gate>
    </Suspense>
  );
}
