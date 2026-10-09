"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/account", label: "Overview" },
  { href: "/account/profile", label: "Profile" },
  { href: "/account/addresses", label: "Addresses" },
  { href: "/account/orders", label: "Orders" },
  { href: "/wishlist", label: "Wishlist" },
];

export default function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Account" className="flex gap-2 overflow-x-auto md:flex-col">
      {items.map((i) => {
        const active = i.href === "/account" ? pathname === i.href : pathname.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
              active ? "bg-accent/15 text-accent" : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
