import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const RESULTS_DIR = join(process.cwd(), "data", "results");

export async function POST(req: NextRequest) {
  try {
    const { actionItem, owner, client, priority, category } = await req.json();
    if (!actionItem?.trim()) return NextResponse.json({ error: "actionItem required" }, { status: 400 });

    if (!existsSync(RESULTS_DIR)) mkdirSync(RESULTS_DIR, { recursive: true });

    const id = `qa-${randomUUID().slice(0, 8)}`;
    const item = {
      id,
      source: "Manual",
      createdAt: new Date().toISOString(),
      summary: "",
      actionItem: actionItem.trim(),
      owner: owner ?? "Unassigned",
      client: client?.trim() || "RCG Internal",
      priority: priority ?? "Medium",
      category: category ?? "Internal Action Item",
      isOverdue: false,
    };

    const file = join(RESULTS_DIR, `quick-add-${Date.now()}.json`);
    writeFileSync(file, JSON.stringify([item], null, 2), "utf8");

    return NextResponse.json({ id, status: "added" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
