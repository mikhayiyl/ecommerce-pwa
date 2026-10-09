"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/guards";
import { slugify } from "@/lib/validations/admin-product";

export type CategoryState = { error?: string; success?: string };

const categorySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  description: z.string().trim().max(500).optional().transform((v) => v || null),
});

async function uniqueSlug(name: string, excludeId?: string) {
  const base = slugify(name) || "category";
  let slug = base;
  for (let i = 2; ; i++) {
    const hit = await prisma.category.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === excludeId) return slug;
    slug = `${base}-${i}`;
  }
}

export async function saveCategoryAction(
  id: string | null,
  _prev: CategoryState,
  formData: FormData,
): Promise<CategoryState> {
  await requireAdmin();
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (id) {
    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return { error: "Category not found" };
    await prisma.category.update({
      where: { id },
      data: {
        ...parsed.data,
        slug: existing.name === parsed.data.name ? existing.slug : await uniqueSlug(parsed.data.name, id),
      },
    });
  } else {
    await prisma.category.create({
      data: { ...parsed.data, slug: await uniqueSlug(parsed.data.name) },
    });
  }
  revalidatePath("/", "layout");
  return { success: id ? "Category updated" : "Category created" };
}

export async function deleteCategoryAction(id: string): Promise<CategoryState> {
  await requireAdmin();
  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) return { error: `Cannot delete: ${count} product(s) use this category.` };
  await prisma.category.delete({ where: { id } });
  revalidatePath("/", "layout");
  return { success: "Category deleted" };
}
