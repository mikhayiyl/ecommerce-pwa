"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

type NavLink = { href: string; label: string };

export default function MobileNav({ links, children }: { links: NavLink[]; children?: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-lg"
      >
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <div
          id="mobile-menu"
          className="absolute inset-x-0 top-16 border-b border-border bg-background px-4 py-4 shadow-lg"
        >
          <nav aria-label="Mobile" className="flex flex-col gap-1 text-base">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-3 text-muted transition hover:bg-surface hover:text-accent"
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-border px-3 pt-4 text-sm text-muted" onClick={() => setOpen(false)}>
              {children}
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
