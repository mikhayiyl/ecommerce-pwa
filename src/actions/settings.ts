"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/guards";
import { settingsInputSchema, settingsToData } from "@/lib/validations/settings";

export type SettingsState = { error?: string; success?: string };

export async function updateSettingsAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireAdmin();
  const parsed = settingsInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = settingsToData(parsed.data);
  await prisma.storeSettings.upsert({ where: { id: "store" }, update: data, create: { id: "store", ...data } });
  revalidatePath("/", "layout");
  return { success: "Settings saved" };
}
