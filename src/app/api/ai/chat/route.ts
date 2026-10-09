import { z } from "zod";
import { naturalLanguageSearch } from "@/features/products/nl-search";
import { fallbackReply, factsBlock, SYSTEM_PROMPT, type FactProduct } from "@/lib/ai/assistant";
import { generateWithGemini } from "@/lib/ai/gemini";
import { rateLimit, splitComparison } from "@/lib/ai/intent";

const schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(500) }))
    .min(1)
    .max(12),
});

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  if (!rateLimit(`chat:${ip}`)) return Response.json({ error: "Too many requests. Please slow down." }, { status: 429 });

  const body = schema.safeParse(await request.json().catch(() => null));
  if (!body.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { messages } = body.data;
  const last = messages[messages.length - 1];
  if (last.role !== "user") return Response.json({ error: "Last message must be from the user" }, { status: 400 });

  const parts = splitComparison(last.content);
  let products: FactProduct[];
  if (parts) {
    const found = await Promise.all(parts.map((part) => naturalLanguageSearch(part, 1)));
    products = found.flatMap((f) => f.products);
  } else {
    products = (await naturalLanguageSearch(last.content, 6)).products;
  }

  const system = `${SYSTEM_PROMPT}\n\n${factsBlock(products)}`;
  const aiText = await generateWithGemini(system, messages);
  return Response.json({
    reply: aiText ?? fallbackReply(products, Boolean(parts)),
    ai: aiText !== null,
    products: products.map((p) => ({ slug: p.slug, name: p.name, priceCents: p.priceCents, currency: p.currency })),
  });
}
