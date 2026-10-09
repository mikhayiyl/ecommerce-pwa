import { Suspense } from "react";
import AdminSidebar from "@/components/layout/AdminSidebar";
import { requireAdmin } from "@/lib/security/guards";

async function Gate({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Suspense fallback={<aside className="md:w-56 md:shrink-0" />}>
        <AdminSidebar />
      </Suspense>
      <main className="min-w-0 flex-1 px-4 py-8 md:px-8">
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <Gate>{children}</Gate>
        </Suspense>
      </main>
    </div>
  );
}
