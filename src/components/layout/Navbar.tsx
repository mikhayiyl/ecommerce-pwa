import { Suspense } from "react";
import Link from "next/link";
import UserMenu from "@/components/layout/UserMenu";
import MobileNav from "@/components/layout/MobileNav";
import CartLink from "@/components/cart/CartLink";

const links = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Shop" },
  { href: "/search", label: "Search" },
  { href: "/wishlist", label: "Wishlist" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Shop<span className="text-accent">Wave</span>
        </Link>
        <div className="flex items-center gap-4 text-sm text-muted">
          <nav aria-label="Main" className="hidden items-center gap-6 md:flex">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="transition hover:text-accent">
                {l.label}
              </Link>
            ))}
          </nav>
          <CartLink />
          <div className="hidden md:block">
            <Suspense fallback={<span className="w-14" />}>
              <UserMenu />
            </Suspense>
          </div>
          <MobileNav links={links}>
            <Suspense fallback={<span className="w-14" />}>
              <UserMenu />
            </Suspense>
          </MobileNav>
        </div>
      </div>
    </header>
  );
}
