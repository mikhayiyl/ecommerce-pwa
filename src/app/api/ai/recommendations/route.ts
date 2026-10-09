import { z } from "zod";
import { auth } from "@/lib/auth";
import { getRecommendations } from "@/features/recommendations/queries";

const schema = z.object({ viewed: z.string().max(1000).optional() });

export async function GET(request: Request) {
  const parsed = schema.safeParse({ viewed: new URL(request.url).searchParams.get("viewed") ?? undefined });
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const session = await auth();
  const viewedIds = parsed.data.viewed?.split(",").filter((id) => /^[\w-]{1,40}$/.test(id)) ?? [];
  return Response.json(await getRecommendations({ userId: session?.user?.id, viewedIds }));
}
