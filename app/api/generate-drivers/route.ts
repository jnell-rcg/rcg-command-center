import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are RCG's Finance Narrative Agent thinking through a flagged variance for Rick Sanchez.

Rick's rule: never name a problem without naming a solution. When a variance crosses ±15% AND >$10K, Rick identifies the most likely driver and immediately offers 2–3 corrective options the CEO can act on.

You will be given:
- Client industry
- Account name (the line item that flagged)
- Actual vs budget numbers and variance %
- Any other context available

Return ONLY valid JSON — no explanation, no markdown, no code fences:

{
  "driver": "1–2 sentence explanation of the most likely cause of this variance, written in Rick's voice — direct, specific, no hedging. Reference the account and what typically drives it in this industry.",
  "options": "3 concise corrective paths, numbered 1–3, each on its own line. Rick's voice — directive, actionable, no fluff. Format:\n1. [action]\n2. [action]\n3. [action]"
}

Rick's voice rules:
- Direct and confident — "The variance in [account] points to [specific driver]" not "This may possibly be due to..."
- Options are specific — dollar amounts, timelines, or named levers where possible
- Never alarm without a path forward
- Options match the industry context`;

export async function POST(req: NextRequest) {
  try {
    const { account, actual, budget, variancePct, industry, clientContext } = await req.json();

    const userInput = `
Industry: ${industry || "Not specified"}
Account: ${account}
Actual: $${actual}
Budget: $${budget}
Variance: ${variancePct}
Client context: ${clientContext || "None"}

Generate driver and options for this variance.
`;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userInput }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text.trim() : "";
    if (!raw) throw new Error("No output from Claude");

    const cleaned = raw
      .replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: { driver: string; options: string };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Invalid JSON from Claude");
    }

    return NextResponse.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
