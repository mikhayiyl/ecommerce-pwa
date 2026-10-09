import type { Metadata } from "next";
import ProfileForm from "@/components/account/ProfileForm";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/security/guards";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser("/account/profile");
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, email: true } });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Profile</h1>
      <ProfileForm name={row?.name ?? ""} email={row?.email ?? ""} />
    </div>
  );
}
