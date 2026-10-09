const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export function aiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function generateWithGemini(system: string, turns: ChatTurn[]): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: turns.map((t) => ({ role: t.role === "user" ? "user" : "model", parts: [{ text: t.content }] })),
        generationConfig: { temperature: 0.4, maxOutputTokens: 600 },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
    return typeof text === "string" && text.trim() ? text.trim() : null;
  } catch {
    return null;
  }
}
