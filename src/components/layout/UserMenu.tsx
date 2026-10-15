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
      <div className="flex items-center gap-4">
        <Link href="/login" className="transition hover:text-accent">
          Sign in
        </Link>
        <Link
          href="/register"
          className="rounded-lg bg-accent px-3 py-2 font-semibold text-background transition hover:bg-accent-strong"
        >
          Create account
        </Link>
      </div>
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
