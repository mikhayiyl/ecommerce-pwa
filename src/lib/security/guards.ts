import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/lib/auth";

export async function requireUser(callbackUrl = "/account") {
  await connection();
  const session = await auth();
  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }
  return session.user;
}

export async function requireAdmin() {
  const user = await requireUser("/admin");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
