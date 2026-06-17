import { NextResponse } from "next/server";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { getLastSweepAt, setLastSweepAt } from "@/lib/stateStore";

export async function GET() {
  return NextResponse.json({ lastSweepAt: getLastSweepAt() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    // Use last sweep time as the since boundary; fall back to `days` param
    const lastSweepAt = getLastSweepAt();
    let since: string;
    if (lastSweepAt) {
      since = lastSweepAt;
    } else {
      const days: number = typeof body.days === "number" ? body.days : 14;
      since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    }

    const sweepDir = join(process.cwd(), "data", "sweep-requests");
    if (!existsSync(sweepDir)) mkdirSync(sweepDir, { recursive: true });

    const id = `sweep-${Date.now()}`;
    const payload = { id, since, requestedAt: new Date().toISOString() };
    writeFileSync(join(sweepDir, `${id}.json`), JSON.stringify(payload, null, 2), "utf8");

    // Record sweep time immediately so next sweep starts from now
    setLastSweepAt(new Date().toISOString());

    return NextResponse.json({ id, since, status: "requested", message: `Sweep of meetings since ${since} queued` });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
