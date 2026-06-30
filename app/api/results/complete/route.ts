import { NextRequest, NextResponse } from "next/server";
import { appendCompleted } from "@/lib/stateStore";

export async function POST(req: NextRequest) {
  const { id } = await req.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  appendCompleted(id);
  return NextResponse.json({ ok: true });
}
