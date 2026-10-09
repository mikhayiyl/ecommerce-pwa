import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Usage: npm run make-admin -- someone@example.com
const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run make-admin -- <email>");
  process.exit(1);
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL_UNPOOLED }),
});

async function main() {
  const user = await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
  });
  console.log(`${user.email} is now an ADMIN`);
}

main()
  .catch((e) => {
    console.error(e.code === "P2025" ? `No user with email ${email}` : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
