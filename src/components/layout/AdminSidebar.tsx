"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/discounts", label: "Discounts" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="border-b border-border bg-surface md:min-h-screen md:w-56 md:shrink-0 md:border-b-0 md:border-r">
      <div className="flex items-center justify-between px-4 py-4 md:block">
        <Link href="/admin" className="text-lg font-bold">
          Shop<span className="text-accent">Wave</span>{" "}
          <span className="text-xs font-normal text-muted">admin</span>
        </Link>
        <Link href="/" className="text-xs text-muted hover:text-accent md:mt-1 md:block">
          ← View store
        </Link>
      </div>
      <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:pb-4">
        {items.map((i) => {
          const active =
            i.href === "/admin" ? pathname === "/admin" : pathname.startsWith(i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
                active ? "bg-accent/15 text-accent" : "text-muted hover:bg-background hover:text-foreground"
              }`}
            >
              {i.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
