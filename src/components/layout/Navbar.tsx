import Link from "next/link";
import CartLink from "@/components/cart/CartLink";

const links = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Shop" },
  { href: "/search", label: "Search" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4">
        <Link href="/" className="text-xl font-bold tracking-tight">
          Shop<span className="text-accent">Wave</span>
        </Link>
        <nav aria-label="Main" className="flex items-center gap-6 text-sm text-muted">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="transition hover:text-accent">
              {l.label}
            </Link>
          ))}
          <CartLink />
        </nav>
      </div>
    </header>
  );
}
