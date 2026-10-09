import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type OrderStatus } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL_UNPOOLED }),
});

const names = ["Amina Yusuf", "Brian Otieno", "Chloe Martin", "Daniel Kim", "Esther Wanjiru", "Farid Hassan"];
const comments = [
  "Great quality, arrived quickly.",
  "Good value for the price.",
  "Not quite what I expected.",
  "Absolutely love it!",
  "Does the job, nothing special.",
];
const statuses: OrderStatus[] = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "DELIVERED", "PENDING", "CANCELLED"];
const rand = (n: number) => Math.floor(Math.random() * n);

async function main() {
  if ((await prisma.order.count()) > 0) {
    console.log("Demo data already present, skipping.");
    return;
  }
  const passwordHash = await bcrypt.hash("Demo12345", 10);
  const users = [];
  for (const name of names) {
    const email = `${name.split(" ")[0].toLowerCase()}@demo.shop`;
    users.push(
      await prisma.user.upsert({
        where: { email },
        update: {},
        create: { name, email, passwordHash },
      }),
    );
  }
  const products = await prisma.product.findMany({ take: 40 });

  for (let i = 0; i < 40; i++) {
    const user = users[rand(users.length)];
    const picked = [...products].sort(() => Math.random() - 0.5).slice(0, 1 + rand(3));
    const items = picked.map((p) => ({
      productId: p.id,
      name: p.name,
      priceCents: p.priceCents,
      quantity: 1 + rand(3),
    }));
    const subtotal = items.reduce((s, it) => s + it.priceCents * it.quantity, 0);
    const shipping = subtotal >= 10000 ? 0 : 599;
    const status = statuses[rand(statuses.length)];
    const createdAt = new Date(Date.now() - rand(60) * 86_400_000);
    await prisma.order.create({
      data: {
        userId: user.id,
        email: user.email,
        status,
        paymentStatus: status === "PENDING" ? "UNPAID" : status === "CANCELLED" ? "FAILED" : "PAID",
        subtotalCents: subtotal,
        shippingCents: shipping,
        totalCents: subtotal + shipping,
        shippingName: user.name,
        shippingAddress: "12 Demo Street, Nairobi, Kenya",
        createdAt,
        items: { create: items },
      },
    });
  }

  for (const product of products.slice(0, 15)) {
    const user = users[rand(users.length)];
    await prisma.review.upsert({
      where: { productId_userId: { productId: product.id, userId: user.id } },
      update: {},
      create: {
        productId: product.id,
        userId: user.id,
        rating: 3 + rand(3),
        comment: comments[rand(comments.length)],
      },
    });
  }

  await prisma.discount.createMany({
    data: [
      { code: "WELCOME10", type: "PERCENT", value: 10 },
      { code: "SAVE5", type: "FIXED", value: 500, minSubtotalCents: 3000 },
    ],
    skipDuplicates: true,
  });
  await prisma.storeSettings.upsert({ where: { id: "store" }, update: {}, create: {} });
  console.log("Demo customers, orders, reviews and discounts created.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
