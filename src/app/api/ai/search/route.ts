import { z } from "zod";
import { naturalLanguageSearch } from "@/features/products/nl-search";

const schema = z.object({ q: z.string().trim().min(2).max(300) });

export async function GET(request: Request) {
  const parsed = schema.safeParse({ q: new URL(request.url).searchParams.get("q") ?? "" });
  if (!parsed.success) return Response.json({ error: "Query must be 2-300 characters" }, { status: 400 });
  const { parsed: filters, products } = await naturalLanguageSearch(parsed.data.q);
  return Response.json({ filters, products });
}
