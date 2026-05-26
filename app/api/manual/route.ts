import { NextRequest, NextResponse } from "next/server";
import { writePending } from "@/lib/fileQueue";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    const id = randomUUID();
    writePending({ id, source: "Manual", text });
    return NextResponse.json({ id, status: "pending" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
