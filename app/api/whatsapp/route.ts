import { NextRequest, NextResponse } from "next/server";
import { writePending } from "@/lib/fileQueue";
import { randomUUID } from "crypto";

// WhatsApp export line format: [M/D/YY, H:MM:SS AM/PM] Name: message
// Example: [4/15/26, 9:30:00 AM] Rick Robyn: Hey can you follow up with...
const WA_LINE_RE = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+\d{1,2}:\d{2}:\d{2}\s+[AP]M\]/;

function parseWhatsAppDate(line: string): Date | null {
  const m = line.match(/^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}),/);
  if (!m) return null;
  const [, month, day, yearRaw] = m;
  const year = yearRaw.length === 2 ? 2000 + parseInt(yearRaw) : parseInt(yearRaw);
  return new Date(year, parseInt(month) - 1, parseInt(day));
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const daysParam = formData.get("days");
    const days = daysParam ? parseInt(String(daysParam), 10) : 30;

    if (!file) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const raw = buffer.toString("utf-8");

    // Filter to lines within the last N days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);

    const lines = raw.split("\n");
    const filtered: string[] = [];
    let currentDate: Date | null = null;
    let include = false;

    for (const line of lines) {
      if (WA_LINE_RE.test(line)) {
        currentDate = parseWhatsAppDate(line);
        include = currentDate !== null && currentDate >= cutoff;
      }
      if (include) {
        filtered.push(line);
      }
    }

    const text = filtered.join("\n").trim();

    if (!text) {
      return NextResponse.json(
        { error: `No messages found in the last ${days} days` },
        { status: 400 }
      );
    }

    const id = randomUUID();
    writePending({ id, source: "WhatsApp", text });
    return NextResponse.json({ id, status: "pending" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
