"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string; products?: { slug: string; name: string; priceCents: number; currency: string }[] };

const GREETING: Msg = {
  role: "assistant",
  content: 'Hi! Ask me for products in plain English, e.g. "wireless headphones under $100" or "compare MacBook vs Dell XPS".',
};

export default function ShoppingAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(1).slice(-10).map(({ role, content }) => ({ role, content })) }),
      });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: res.ok ? data.reply : (data.error ?? "Something went wrong."), products: res.ok ? data.products : undefined }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "I can't reach the server right now. Please check your connection." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="assistant-panel"
        className="fixed bottom-20 right-4 z-40 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-background shadow-lg lg:bottom-6"
      >
        {open ? "Close" : "✨ Ask AI"}
      </button>
      {open && (
        <section
          id="assistant-panel"
          aria-label="Shopping assistant"
          className="fixed bottom-36 right-4 z-40 flex h-[28rem] max-h-[70vh] w-[calc(100vw-2rem)] max-w-sm flex-col rounded-xl border border-border bg-surface shadow-2xl lg:bottom-20"
        >
          <div className="flex-1 space-y-3 overflow-y-auto p-3 text-sm" aria-live="polite">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "text-right" : ""}>
                <p className={`inline-block max-w-[90%] whitespace-pre-line rounded-lg px-3 py-2 text-left ${m.role === "user" ? "bg-accent text-background" : "bg-white/5"}`}>
                  {m.content}
                </p>
                {m.products && m.products.length > 0 && (
                  <ul className="mt-1 space-y-1 text-left">
                    {m.products.slice(0, 4).map((p) => (
                      <li key={p.slug}>
                        <Link href={`/products/${p.slug}`} className="text-accent hover:underline">
                          {p.name} · {formatPrice(p.priceCents, p.currency)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            {busy && <p className="text-muted">Thinking…</p>}
            <div ref={endRef} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-border p-2">
            <label htmlFor="assistant-input" className="sr-only">Message</label>
            <input
              id="assistant-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={500}
              placeholder="Ask about products…"
              className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2"
            />
            <button disabled={busy} className="rounded-lg bg-accent px-3 py-2 font-medium text-background disabled:opacity-50">Send</button>
          </form>
        </section>
      )}
    </>
  );
}
