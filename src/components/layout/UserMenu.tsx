import Link from "next/link";
import { connection } from "next/server";
import { logoutAction } from "@/actions/auth";
import { auth } from "@/lib/auth";

export default async function UserMenu() {
  await connection();
  const session = await auth();
  const user = session?.user;

  if (!user) {
    return (
      <Link href="/login" className="transition hover:text-accent">
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {user.role === "ADMIN" && (
        <Link href="/admin" className="transition hover:text-accent">
          Admin
        </Link>
      )}
      <Link href="/account" className="transition hover:text-accent">
        {user.name?.split(" ")[0] ?? "Account"}
      </Link>
      <form action={logoutAction}>
        <button className="transition hover:text-accent">Sign out</button>
      </form>
    </div>
  );
}
