import { expireStaleOrders } from "@/features/orders/expire";
import { safeEqual } from "@/lib/security/safe-equal";

// Call every few minutes with `Authorization: Bearer $CRON_SECRET`.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const given =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";

  if (!secret || !safeEqual(given, secret)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cancelled = await expireStaleOrders();
    return Response.json({ ok: true, cancelled });
  } catch {
    return Response.json(
      { error: "Failed to expire stale orders" },
      { status: 500 },
    );
  }
}
