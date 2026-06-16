import { NextRequest, NextResponse } from "next/server";
import { readArchive, appendArchive } from "@/lib/stateStore";

export async function GET() {
  return NextResponse.json({ items: readArchive() });
}

export async function POST(req: NextRequest) {
  const item = await req.json();
  const items = appendArchive(item);
  return NextResponse.json({ items });
}
