import type { Metadata } from "next";
import { requireUser } from "@/lib/security/guards";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const user = await requireUser("/account");
  return (
    <div>
      <h1 className="text-2xl font-bold">Hello, {user.name ?? "shopper"}</h1>
      <p className="mt-2 text-muted">{user.email}</p>
    </div>
  );
}
