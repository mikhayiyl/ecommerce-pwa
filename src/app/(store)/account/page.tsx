import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/security/guards";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await requireUser("/account");
  const [orders, wishlist] = await Promise.all([
    prisma.order.count({ where: { userId: user.id } }),
    prisma.wishlistItem.count({ where: { userId: user.id } }),
  ]);
  const cards = [
    { href: "/account/orders", label: "Orders", value: orders },
    { href: "/wishlist", label: "Wishlist items", value: wishlist },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hello, {user.name ?? "shopper"}</h1>
        <p className="mt-1 text-muted">{user.email}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="rounded-xl border border-border bg-surface p-5 transition hover:border-accent">
            <p className="text-sm text-muted">{c.label}</p>
            <p className="mt-1 text-3xl font-bold text-accent">{c.value}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
