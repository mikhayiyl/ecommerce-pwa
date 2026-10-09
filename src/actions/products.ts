"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/security/guards";
import { productInputSchema, slugify } from "@/lib/validations/admin-product";

export type ProductFormState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

async function uniqueSlug(name: string, excludeId?: string) {
  const base = slugify(name) || "product";
  let slug = base;
  for (let i = 2; ; i++) {
    const hit = await prisma.product.findUnique({ where: { slug }, select: { id: true } });
    if (!hit || hit.id === excludeId) return slug;
    slug = `${base}-${i}`;
  }
}

function refresh() {
  revalidatePath("/", "layout");
}

export async function saveProductAction(
  id: string | null,
  _prev: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();

  const parsed = productInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { price, imageUrl, ...rest } = parsed.data;

  const category = await prisma.category.findUnique({ where: { id: rest.categoryId } });
  if (!category) return { fieldErrors: { categoryId: ["Category not found"] } };

  const data = {
    ...rest,
    priceCents: Math.round(price * 100),
    imageUrl: imageUrl ?? null,
    images: imageUrl ? [imageUrl] : [],
  };

  if (id) {
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return { error: "Product not found" };
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id },
        data: {
          ...data,
          images: imageUrl ? [imageUrl, ...existing.images.filter((i) => i !== existing.imageUrl && i !== imageUrl)] : existing.images,
          slug: existing.name === data.name ? existing.slug : await uniqueSlug(data.name, id),
        },
      });
      if (existing.stock !== data.stock) {
        await tx.stockMovement.create({
          data: { productId: id, delta: data.stock - existing.stock, reason: "Edited in product form" },
        });
      }
    });
  } else {
    const slug = await uniqueSlug(data.name);
    await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data: { ...data, slug } });
      if (data.stock > 0) {
        await tx.stockMovement.create({
          data: { productId: product.id, delta: data.stock, reason: "Initial stock" },
        });
      }
    });
  }

  refresh();
  redirect("/admin/products");
}

export async function setProductStatusAction(id: string, status: "ACTIVE" | "ARCHIVED") {
  await requireAdmin();
  await prisma.product.update({ where: { id }, data: { status } });
  refresh();
}
