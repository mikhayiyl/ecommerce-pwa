import { redirect } from "next/navigation";
import { Suspense } from "react";
import { buttonClass, inputClass } from "@/components/admin/ui";
import { prisma } from "@/lib/prisma";
import { clientIp } from "@/lib/security/client-ip";
import { rateLimit } from "@/lib/security/rate-limit";

export const metadata = { title: "Track your order", robots: { index: false } };

async function Track({ searchParams }: { searchParams: PageProps<"/orders/track">["searchParams"] }) {
  const sp = await searchParams;
  const rawNumber = typeof sp.number === "string" ? sp.number.trim().replace(/^#/, "") : "";
  const email = typeof sp.email === "string" ? sp.email.trim().toLowerCase() : "";

  let problem: string | null = null;
  if (rawNumber && email) {
    const number = Number(rawNumber);
    if (!rateLimit(`track:${await clientIp()}`, 10)) {
      problem = "Too many lookups. Please wait a minute and try again.";
    } else if (Number.isInteger(number) && number > 0 && number < 2_147_483_647) {
      const order = await prisma.order.findFirst({ where: { number, email }, select: { id: true, userId: true } });
      // Orders that belong to an account are shown from the account area, after sign-in.
      if (order) redirect(order.userId ? `/account/orders/${order.id}` : `/checkout/success?order=${order.id}`);
    }
    problem ??= "We could not find an order with that number and email.";
  }

  return (
    <form method="get" className="mx-auto max-w-md space-y-3 rounded-xl border border-border bg-surface p-6">
      <label className="block text-sm">
        Order number
        <input name="number" required inputMode="numeric" defaultValue={rawNumber} className={inputClass} placeholder="1042" />
      </label>
      <label className="block text-sm">
        Email used at checkout
        <input name="email" type="email" required defaultValue={email} className={inputClass} autoComplete="email" />
      </label>
      {problem && <p role="alert" className="text-sm text-red-400">{problem}</p>}
      <button type="submit" className={`${buttonClass} w-full`}>Find my order</button>
    </form>
  );
}

export default function TrackOrderPage(props: PageProps<"/orders/track">) {
  return (
    <>
      <h1 className="mb-6 text-3xl font-bold">Track your order</h1>
      <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-surface" />}>
        <Track searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
