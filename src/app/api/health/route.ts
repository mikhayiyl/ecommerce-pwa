import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", database: "up" });
  } catch {
    return Response.json({ status: "error", database: "down" }, { status: 503 });
  }
}
