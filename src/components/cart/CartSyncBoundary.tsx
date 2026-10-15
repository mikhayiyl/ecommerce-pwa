import { Suspense } from "react";
import { connection } from "next/server";
import CartSync from "@/components/cart/CartSync";
import { auth } from "@/lib/auth";

async function CartSyncWithSession() {
  await connection();

  const session = await auth();

  return <CartSync userId={session?.user?.id ?? null} />;
}

export default function CartSyncBoundary() {
  return (
    <Suspense fallback={null}>
      <CartSyncWithSession />
    </Suspense>
  );
}
