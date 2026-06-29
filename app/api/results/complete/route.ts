import { NextRequest, NextResponse } from "next/server";
import { markItemCompleted } from "@/lib/fileQueue";

export async function POST(req: NextRequest) {
  const { id } = await req.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const found = markItemCompleted(id);
  return NextResponse.json({ ok: found });
}
