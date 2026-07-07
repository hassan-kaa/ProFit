"use client";

import { useState } from "react";
import type { Program } from "@/lib/types";
import { Button } from "./ui";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "Make this week slightly easier",
  "Suggest a deload version",
  "Balance push/pull volume",
  "Swap exercises needing no equipment",
];

export default function AiAssistPanel({
  program,
  onClose,
}: {
  program: Program;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || loading) return;
    const next = [...messages, { role: "user" as const, content: msg }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, program }),
      });
      const data = await res.json();
      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.reply ?? data.error ?? "Something went wrong.",
        },
      ]);
    } catch {
      setMessages([
        ...next,
        { role: "assistant", content: "Network error — please retry." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full w-96 shrink-0 flex-col border-l border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ai/15 text-ai">
            ✦
          </span>
          <div>
            <p className="text-sm font-semibold">AI Assistant</p>
            <p className="text-xs text-text-faint">
              knows the open program&apos;s full context
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="cursor-pointer text-text-dim hover:text-text"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-text-dim">
              Ask for adjustments to “{program.title}” — volume tweaks,
              exercise swaps, deloads, or a review of the weekly balance.
            </p>
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                className="block w-full cursor-pointer rounded-lg border border-ai/25 bg-ai/5 px-3 py-2 text-left text-xs text-ai transition-colors hover:bg-ai/10"
              >
                {p}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[90%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
              m.role === "user"
                ? "ml-auto bg-primary/15 text-text"
                : "bg-surface-2 text-text"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="rounded-xl bg-surface-2 px-3 py-2 text-sm text-ai">
            Thinking…
          </div>
        )}
      </div>

      <form
        className="flex gap-2 border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this program…"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm outline-none placeholder:text-text-faint focus:border-ai/60"
        />
        <Button variant="ai" type="submit" disabled={loading || !input.trim()}>
          ↑
        </Button>
      </form>
    </div>
  );
}
