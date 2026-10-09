import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import data from "./seed-data.json";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL_UNPOOLED }),
});

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const titleCase = (s: string) =>
  s.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");

async function main() {
  const categories = [...new Set(data.map((p) => p.category))];

  for (const slug of categories) {
    const first = data.find((p) => p.category === slug)!;
    await prisma.category.upsert({
      where: { slug },
      update: { imageUrl: first.thumbnail },
      create: { slug, name: titleCase(slug), imageUrl: first.thumbnail },
    });
  }

  const cats = await prisma.category.findMany();
  const byslug = new Map(cats.map((c) => [c.slug, c.id]));

  for (const [i, p] of data.entries()) {
    const slug = slugify(p.title);
    const fields = {
      name: p.title,
      description: p.description,
      priceCents: Math.round(p.price * 100),
      stock: p.stock,
      brand: p.brand,
      rating: p.rating,
      imageUrl: p.thumbnail,
      images: p.images,
      status: "ACTIVE" as const,
      featured: i % 7 === 0,
      categoryId: byslug.get(p.category)!,
    };
    await prisma.product.upsert({ where: { slug }, update: fields, create: { slug, ...fields } });
  }

  console.log(`Seeded ${categories.length} categories and ${data.length} products`);
}

main().finally(() => prisma.$disconnect());
