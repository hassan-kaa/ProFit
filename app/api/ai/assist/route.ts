import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { Program } from "@/lib/types";
import { DAY_LABELS } from "@/lib/types";

export const runtime = "nodejs";

function programToText(p: Program): string {
  const lines = [`Program: ${p.title} (${p.scope}, ${p.cadence})`];
  if (p.description) lines.push(`Description: ${p.description}`);
  for (const d of [...p.days].sort((a, b) => a.day_index - b.day_index)) {
    const label = DAY_LABELS[d.day_index] ?? `Day ${d.day_index + 1}`;
    if (d.is_rest) {
      lines.push(`${label}: Rest`);
      continue;
    }
    lines.push(`${label}: ${d.title ?? "Session"}`);
    for (const ex of d.exercises) {
      lines.push(
        `  - ${ex.exercise_name}: ${ex.sets ?? "?"}x${ex.reps ?? "?"}` +
          (ex.load ? ` @ ${ex.load}` : "") +
          (ex.rest_seconds ? ` (rest ${ex.rest_seconds}s)` : "")
      );
    }
  }
  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are the AI assistant inside KamilFit, a coaching app.
You help a certified fitness coach refine training programs.

Rules:
- Be concise and practical. The user is a professional coach, not a beginner.
- When suggesting changes, reference specific days and exercises from the program context.
- Respect the program's structure (cadence, rest days) unless asked to change it.
- Give concrete numbers (sets, reps, load adjustments as percentages) rather than vague advice.
- If a request risks overtraining or injury, flag it briefly and propose a safer alternative.
- Keep answers under ~250 words unless asked for a full program rewrite.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      reply:
        "AI is not configured yet. Add ANTHROPIC_API_KEY to .env.local to enable real program assistance.\n\n(Demo response) For a slightly easier week: drop one set from each compound lift and reduce loads ~10%, keep accessory work unchanged.",
    });
  }

  try {
    const { messages, program } = (await req.json()) as {
      messages: { role: "user" | "assistant"; content: string }[];
      program: Program;
    };

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: `${SYSTEM_PROMPT}\n\nCurrent program context:\n${programToText(program)}`,
      messages: messages.slice(-12),
    });

    const reply = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("AI assist error:", err);
    return NextResponse.json(
      { error: "AI request failed. Check your API key and try again." },
      { status: 500 }
    );
  }
}
