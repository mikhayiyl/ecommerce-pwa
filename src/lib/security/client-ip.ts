import { headers } from "next/headers";

/** Best-effort client address for rate-limit keys inside server actions and server components. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}
