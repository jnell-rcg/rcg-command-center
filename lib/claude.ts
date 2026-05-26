import { spawnSync } from "child_process";
import { ActionItem, Category, Owner, Priority, Source } from "./types";
import { isPast, parseISO } from "date-fns";

const PROMPT_PREFIX = `You are an operational intelligence assistant for RCG (Robyn Consulting Group), a fractional CFO, FP&A, and accounting consultancy.

PRIMARY USERS:
- Janelle Ridge (Director of Operations) — EOS implementation, payroll, month-end close scheduling, internal SOPs, onboarding systems, delegation, cross-functional coordination. Does NOT own client relationships directly but has full visibility.
- Rick Sanchez (Founder) — client strategy, financial modeling, sales, board/investor work, founder-level decisions.

COMPANY CONTEXT:
RCG is actively implementing EOS (Traction). Current focus areas: CFO sprint redesign, productized delivery, accounting workflow scalability, AI-enabled ops, KPI reporting, onboarding standardization.

Known recurring client work: CLX (accounting cleanup, controller issues), M&A/Alex portfolio (Altair, Tati, Gurgle, T&D Trades, LaModa, Stenari), Pupsox (broker prep), Paradise (tax filing), Dealership Accelerator/DA/Shane, SmartFit Method, Costco (month-end close), Scaled, Noah CFO project.

OWNER ASSIGNMENT RULES — be precise:
- Janelle: EOS Rocks and accountability tracking, payroll setup, scheduling (MEC meetings, 1:1s, team calls), SOP creation and updates, internal process docs, onboarding coordination, Time Doctor admin, Carbon/KarbonHQ workflow, delegating to team members (Maria, Aleja, Brandon), operational follow-through on Rick's decisions
- Rick: Client-facing strategy calls, financial model builds, invoicing decisions, sales conversations, board/investor prep, pricing strategy, hiring decisions, new business development
- Unassigned: unclear, shared, or requires both

CATEGORY RULES — pick the single most accurate:
- "Client Response Needed" — a client or external contact needs a reply, deliverable, or outreach
- "New Lead / Sales" — prospect, proposal, or revenue opportunity
- "EOS / Accountability" — EOS Rocks, scorecards, L10 meeting prep, accountability chart, issues list
- "Payroll & HR" — payroll processing, contractor payments, time tracking, team scheduling
- "Month-End Close" — MEC scheduling, close checklist items, reconciliation tasks, reporting deadlines
- "Internal Action Item" — internal ops, SOP work, tool setup, delegation, team coordination
- "Deadline / Follow-up" — has a specific deadline or is a follow-up on a prior commitment
- "Missing / Overdue Item" — something that should exist or have happened but hasn't

PRIORITY RULES:
- High: client-facing, has a same-day or next-day deadline, is blocking another deliverable, or was explicitly called urgent
- Medium: this week, important but not blocking
- Low: no hard deadline, nice-to-have, background task

OUTPUT FORMAT — return ONLY a valid JSON array, no markdown, no code fences, no explanation:
[{
  "source": string,
  "summary": string,          // 1 plain-English sentence
  "actionItem": string,       // starts with a verb: "Send...", "Schedule...", "Follow up with..."
  "owner": "Rick" | "Janelle" | "Unassigned",
  "client": string,           // client/project name or "Internal"
  "priority": "High" | "Medium" | "Low",
  "category": "Client Response Needed" | "New Lead / Sales" | "EOS / Accountability" | "Payroll & HR" | "Month-End Close" | "Internal Action Item" | "Deadline / Follow-up" | "Missing / Overdue Item",
  "dueDate": string | null,   // ISO date YYYY-MM-DD if mentioned, else null
  "rawContext": string         // verbatim quote max 100 chars that triggered this item
}]

If no action items are found, return [].

`;

export async function classifyText(
  source: Source,
  text: string
): Promise<Omit<ActionItem, "id" | "createdAt" | "isOverdue">[]> {
  const fullPrompt = `${PROMPT_PREFIX}Source type: ${source}\n\nText to analyze:\n\n${text}`;

  // Use the full path so the Next.js server process can find claude regardless of its PATH
  const claudeBin = process.env.CLAUDE_BIN ?? "C:\\Users\\jridg\\.local\\bin\\claude.exe";

  const result = spawnSync(claudeBin, ["--print"], {
    input: fullPrompt,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 10 * 1024 * 1024,
    shell: false,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr || `claude exited with code ${result.status}`);

  const raw = result.stdout.trim();

  // Strip markdown code fences if claude wraps the output anyway
  const cleaned = raw.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.error("Claude returned non-JSON:", raw);
    return [];
  }
}

export function hydrateItems(
  raw: Omit<ActionItem, "id" | "createdAt" | "isOverdue">[],
  source: Source
): ActionItem[] {
  const now = new Date().toISOString();
  return raw.map((item, i) => ({
    ...item,
    source,
    id: `${source}-${Date.now()}-${i}`,
    createdAt: now,
    isOverdue: item.dueDate ? isPast(parseISO(item.dueDate)) : false,
    owner: (item.owner as Owner) ?? "Unassigned",
    priority: (item.priority as Priority) ?? "Medium",
    category: (item.category as Category) ?? "Internal Action Item",
  }));
}
