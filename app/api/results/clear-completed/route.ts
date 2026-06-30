import { NextResponse } from "next/server";
import { clearCompleted } from "@/lib/stateStore";

export async function POST() {
  clearCompleted();
  return NextResponse.json({ ok: true });
}
