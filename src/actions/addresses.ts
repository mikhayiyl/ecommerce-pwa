"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/security/guards";
import { parseAddressForm } from "@/lib/validations/address";

export type AddressState = { error?: string; success?: string };

const PATH = "/account/addresses";

export async function saveAddressAction(_prev: AddressState, formData: FormData): Promise<AddressState> {
  const user = await requireUser(PATH);
  const parsed = parseAddressForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const id = formData.get("id");

  const count = await prisma.address.count({ where: { userId: user.id } });
  const makeDefault = parsed.data.isDefault || (typeof id !== "string" || !id ? count === 0 : false);

  await prisma.$transaction(async (tx) => {
    if (makeDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    const data = { ...parsed.data, isDefault: makeDefault };
    if (typeof id === "string" && id) {
      const res = await tx.address.updateMany({ where: { id, userId: user.id }, data });
      if (res.count === 0) throw new Error("Address not found");
    } else {
      await tx.address.create({ data: { ...data, userId: user.id } });
    }
  });
  revalidatePath(PATH);
  return { success: "Address saved" };
}

export async function deleteAddressAction(formData: FormData) {
  const user = await requireUser(PATH);
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await prisma.address.deleteMany({ where: { id, userId: user.id } });
  const remaining = await prisma.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  if (remaining && !(await prisma.address.findFirst({ where: { userId: user.id, isDefault: true } }))) {
    await prisma.address.update({ where: { id: remaining.id }, data: { isDefault: true } });
  }
  revalidatePath(PATH);
}

export async function setDefaultAddressAction(formData: FormData) {
  const user = await requireUser(PATH);
  const id = formData.get("id");
  if (typeof id !== "string") return;
  await prisma.$transaction(async (tx) => {
    const owned = await tx.address.findFirst({ where: { id, userId: user.id } });
    if (!owned) return;
    await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
    await tx.address.update({ where: { id }, data: { isDefault: true } });
  });
  revalidatePath(PATH);
}
