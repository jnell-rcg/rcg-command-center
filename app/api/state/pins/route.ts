import { NextRequest, NextResponse } from "next/server";
import { readPins, writePins } from "@/lib/stateStore";

export async function GET() {
  return NextResponse.json({ ids: readPins() });
}

export async function POST(req: NextRequest) {
  const { ids } = await req.json();
  const saved = writePins(ids);
  return NextResponse.json({ ids: saved });
}
