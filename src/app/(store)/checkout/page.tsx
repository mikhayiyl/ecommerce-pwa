import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CheckoutForm from "@/components/checkout/CheckoutForm";

export const metadata = { title: "Checkout", robots: { index: false } };

async function CheckoutContent() {
  const session = await auth();
  const userId = session?.user?.id;
  const [addresses, user] = userId
    ? await Promise.all([
        prisma.address.findMany({ where: { userId }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
        prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
      ])
    : [[], null];
  return (
    <CheckoutForm
      signedInEmail={user?.email ?? null}
      addresses={addresses.map((a) => ({
        id: a.id,
        fullName: a.fullName,
        line1: a.line1,
        line2: a.line2 ?? "",
        city: a.city,
        state: a.state ?? "",
        postalCode: a.postalCode,
        country: a.country,
        phone: a.phone ?? "",
      }))}
    />
  );
}

export default function CheckoutPage() {
  return (
    <>
      <h1 className="mb-6 text-3xl font-bold">Checkout</h1>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-surface" aria-busy="true" />}>
        <CheckoutContent />
      </Suspense>
    </>
  );
}
