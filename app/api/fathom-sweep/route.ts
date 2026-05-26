import { NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

/**
 * POST /api/fathom-sweep
 *
 * Writes a sweep-request flag to data/sweep-requests/<timestamp>.json.
 * The Claude Code loop (running in this session) watches this folder and
 * calls the Fathom MCP when a new request appears, then writes the
 * classified results directly to data/results/fathom-sweep-latest.json.
 *
 * The response returns immediately so the UI can poll /api/status/<id>.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const days: number = typeof body.days === "number" ? body.days : 14;

    const sweepDir = join(process.cwd(), "data", "sweep-requests");
    if (!existsSync(sweepDir)) mkdirSync(sweepDir, { recursive: true });

    const id = `sweep-${Date.now()}`;
    const payload = { id, days, requestedAt: new Date().toISOString() };
    writeFileSync(join(sweepDir, `${id}.json`), JSON.stringify(payload, null, 2), "utf8");

    return NextResponse.json({ id, status: "requested", message: `Sweep of last ${days} days queued` });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
