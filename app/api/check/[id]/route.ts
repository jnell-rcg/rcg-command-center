import { NextRequest, NextResponse } from "next/server";
import { readResult } from "@/lib/fileQueue";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const items = readResult(id);
  if (!items) {
    return NextResponse.json({ status: "pending" });
  }
  return NextResponse.json({ status: "done", items });
}
